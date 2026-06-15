"""Autenticação OIDC (Keycloak) e autorização RBAC.

- Valida o JWT (RS256) contra o JWKS do Keycloak (CESEC §2.2).
- Extrai o subject, nome, e-mail e papéis (realm_access.roles).
- Fornece dependências FastAPI: ``get_current_user`` e ``require_role``.

Em DEV, ``GOLDENDATA_AUTH_DEV_INSECURE=true`` aceita um token não verificado para
facilitar testes locais — JAMAIS habilitar em produção.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import jwt
from fastapi import Depends, HTTPException, Request, status
from jwt import PyJWKClient

from .config import settings

_jwks_client: PyJWKClient | None = None


def _jwks() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(settings.oidc_jwks_url)
    return _jwks_client


@dataclass
class CurrentUser:
    sub: str
    nome: str
    email: str | None
    roles: list[str] = field(default_factory=list)

    def has_any(self, *roles: str) -> bool:
        return any(r in self.roles for r in roles)


def _bearer_token(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token Bearer ausente")
    return auth.split(" ", 1)[1].strip()


def _decode(token: str) -> dict:
    if settings.auth_dev_insecure:
        return jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
    try:
        signing_key = _jwks().get_signing_key_from_jwt(token).key
        return jwt.decode(
            token,
            signing_key,
            algorithms=["RS256", "ES256"],  # RS256 (Keycloak) / ES256 (Supabase)
            audience=settings.oidc_audience,
            issuer=settings.oidc_issuer,
            options={"require": ["exp", "iat", "sub"]},
        )
    except jwt.PyJWTError as exc:  # assinatura/expiração/audience inválidos
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Token inválido: {exc}") from exc


DEMO_ROLES = ["coordenador_comite", "owner_ferramenta", "avaliador", "auditor_dpo", "admin"]


def get_current_user(request: Request) -> CurrentUser:
    # Modo NONE (demonstração): sem login — todo acesso é o usuário demo com
    # todos os papéis. A trilha de auditoria registra ator "demo".
    if settings.auth_mode == "none":
        return CurrentUser(
            sub="demo",
            nome="Usuário de Demonstração",
            email="demo@tjmg.jus.br",
            roles=list(DEMO_ROLES),
        )

    token = _bearer_token(request)

    # Modo LOCAL (MVP): token HS256 emitido pelo próprio backend, roles na claim.
    if settings.auth_mode == "local":
        from . import security_local

        try:
            claims = security_local.decode_token(token)
        except jwt.PyJWTError as exc:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Token inválido: {exc}") from exc
        return CurrentUser(
            sub=claims["sub"],
            nome=claims.get("name") or claims["sub"],
            email=claims.get("email"),
            roles=list(claims.get("roles") or []),
        )

    # Modo SUPABASE: JWT (ES256) validado via JWKS do Supabase; papéis RBAC em
    # app_metadata.roles (definidos no provisionamento do usuário). aud="authenticated".
    if settings.auth_mode == "supabase":
        claims = _decode(token)
        app_meta = claims.get("app_metadata") or {}
        user_meta = claims.get("user_metadata") or {}
        return CurrentUser(
            sub=claims["sub"],
            nome=user_meta.get("nome") or user_meta.get("name") or claims.get("email") or claims["sub"],
            email=claims.get("email"),
            roles=list(app_meta.get("roles") or []),
        )

    # Modo OIDC (Keycloak): roles em realm_access.roles.
    claims = _decode(token)
    realm_roles = (claims.get("realm_access") or {}).get("roles", [])
    return CurrentUser(
        sub=claims["sub"],
        nome=claims.get("name") or claims.get("preferred_username") or claims["sub"],
        email=claims.get("email"),
        roles=list(realm_roles),
    )


def require_role(*roles: str):
    """Dependência que exige ao menos um dos papéis informados (privilégio mínimo)."""

    def _dep(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not user.has_any(*roles):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Requer um dos papéis: {', '.join(roles)}",
            )
        return user

    return _dep
