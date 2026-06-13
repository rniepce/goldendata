"""Authorization Server OAuth 2.1 (PKCE) mínimo para o servidor MCP.

Necessário para o connector do claude.ai (web/Desktop), que só conecta via OAuth
com discovery `.well-known` — não aceita Bearer estático. O SDK do MCP monta as
rotas (/authorize, /token, /register, .well-known, WWW-Authenticate) e valida o
PKCE e o redirect_uri; aqui implementamos apenas a lógica do provider.

Estado em memória (demo): clients/codes/tokens. Em produção institucional, trocar
por um Resource Server puro apontando o Keycloak (RS256/JWKS, ver security_keycloak).

Compatibilidade: `load_access_token` aceita TAMBÉM o token estático (GOLDENDATA_MCP_TOKEN),
para que a conexão via Claude Code CLI (header Bearer) continue funcionando.
"""
from __future__ import annotations

import secrets
import time

import jwt
from mcp.server.auth.provider import (
    AccessToken,
    AuthorizationCode,
    AuthorizationParams,
    OAuthAuthorizationServerProvider,
    construct_redirect_uri,
)
from mcp.shared.auth import OAuthClientInformationFull, OAuthToken

from app.core.config import settings

_SCOPES = ["user"]
_STATIC_TTL = 10 * 365 * 24 * 3600  # token estático: "não expira" (10 anos)


class GoldendataOAuthProvider(OAuthAuthorizationServerProvider):
    """Provider OAuth em memória para a demonstração (auto-consent)."""

    def __init__(self) -> None:
        self.clients: dict[str, OAuthClientInformationFull] = {}
        self.codes: dict[str, AuthorizationCode] = {}
        self.tokens: dict[str, AccessToken] = {}

    # ---- Clientes (DCR: o claude.ai se auto-registra) ----------------------- #
    async def get_client(self, client_id: str) -> OAuthClientInformationFull | None:
        return self.clients.get(client_id)

    async def register_client(self, client_info: OAuthClientInformationFull) -> None:
        self.clients[client_info.client_id] = client_info

    # ---- Authorization Code + PKCE ----------------------------------------- #
    async def authorize(self, client: OAuthClientInformationFull, params: AuthorizationParams) -> str:
        # Demo: auto-consent. O SDK já validou redirect_uri (exact-match) e guardou
        # o code_challenge (PKCE) em params; aqui só emitimos o code de uso único.
        code = secrets.token_urlsafe(32)
        self.codes[code] = AuthorizationCode(
            code=code,
            client_id=client.client_id,
            scopes=params.scopes or _SCOPES,
            expires_at=int(time.time()) + settings.mcp_oauth_code_ttl_seconds,
            code_challenge=params.code_challenge,
            redirect_uri=params.redirect_uri,
            redirect_uri_provided_explicitly=params.redirect_uri_provided_explicitly,
            resource=params.resource,
            subject="mcp",
        )
        return construct_redirect_uri(str(params.redirect_uri), code=code, state=params.state)

    async def load_authorization_code(
        self, client: OAuthClientInformationFull, authorization_code: str
    ) -> AuthorizationCode | None:
        c = self.codes.get(authorization_code)
        return c if c and c.expires_at > time.time() else None

    async def exchange_authorization_code(
        self, client: OAuthClientInformationFull, authorization_code: AuthorizationCode
    ) -> OAuthToken:
        self.codes.pop(authorization_code.code, None)  # uso único
        now = int(time.time())
        exp = now + settings.mcp_oauth_token_ttl_seconds
        aud = str(authorization_code.resource or f"{settings.mcp_public_url}/mcp")
        scopes = authorization_code.scopes or _SCOPES
        claims = {
            "sub": "mcp", "client_id": client.client_id, "iat": now, "exp": exp,
            "scope": " ".join(scopes), "aud": aud, "iss": settings.mcp_public_url,
        }
        access = jwt.encode(claims, settings.mcp_oauth_jwt_secret, algorithm="HS256")
        self.tokens[access] = AccessToken(
            token=access, client_id=client.client_id, scopes=scopes,
            expires_at=exp, resource=authorization_code.resource, subject="mcp",
        )
        return OAuthToken(
            access_token=access, token_type="Bearer",
            expires_in=settings.mcp_oauth_token_ttl_seconds, scope=" ".join(scopes),
        )

    # ---- Validação de token (chamada pelo verifier do SDK a cada request) --- #
    async def load_access_token(self, token: str) -> AccessToken | None:
        # 1) Token estático do CLI (Authorization: Bearer <GOLDENDATA_MCP_TOKEN>).
        if token in settings.mcp_token_list:
            return AccessToken(
                token=token, client_id="cli-static", scopes=_SCOPES,
                expires_at=int(time.time()) + _STATIC_TTL, subject="mcp",
            )
        # 2) Token OAuth (JWT HS256) emitido por nós — valida assinatura, exp e aud.
        try:
            claims = jwt.decode(
                token, settings.mcp_oauth_jwt_secret, algorithms=["HS256"],
                audience=f"{settings.mcp_public_url}/mcp",
            )
        except jwt.PyJWTError:
            return None
        return AccessToken(
            token=token, client_id=claims.get("client_id", ""),
            scopes=(claims.get("scope") or "").split() or _SCOPES,
            expires_at=claims.get("exp"), resource=claims.get("aud"), subject=claims.get("sub"),
        )

    # ---- Refresh (não usado na demo) / revogação --------------------------- #
    async def load_refresh_token(self, client, refresh_token):  # type: ignore[override]
        return None

    async def exchange_refresh_token(self, client, refresh_token, scopes):  # type: ignore[override]
        raise NotImplementedError("refresh token não suportado na demo")

    async def revoke_token(self, token) -> None:  # type: ignore[override]
        self.tokens.pop(getattr(token, "token", token), None)
