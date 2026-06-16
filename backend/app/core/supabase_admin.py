"""Gestão de usuários do Supabase Auth via Admin API (modo auth_mode=supabase).

Usa a service_role key (SECRETA, só backend) para criar/listar/remover usuários
e definir os papéis RBAC em app_metadata.roles. Permite que o coordenador/admin
crie contas pela própria aplicação, sem acessar o painel do Supabase.
"""
from __future__ import annotations

from typing import Any

import httpx

from app.core.config import settings


def _base() -> str:
    # URL explícita ou derivada do issuer OIDC (.../auth/v1 -> raiz do projeto).
    url = settings.supabase_url.rstrip("/")
    if not url:
        iss = settings.oidc_issuer.rstrip("/")
        url = iss[: -len("/auth/v1")] if iss.endswith("/auth/v1") else ""
    if not url or not settings.supabase_service_key:
        raise RuntimeError(
            "Supabase Admin não configurado: defina GOLDENDATA_SUPABASE_SERVICE_KEY "
            "(e, se necessário, GOLDENDATA_SUPABASE_URL)."
        )
    return url


def _headers() -> dict[str, str]:
    key = settings.supabase_service_key
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def _slim(u: dict[str, Any]) -> dict[str, Any]:
    """Projeção segura de um usuário (sem hashes/identidades)."""
    return {
        "id": u.get("id"),
        "email": u.get("email"),
        "nome": (u.get("user_metadata") or {}).get("nome"),
        "roles": (u.get("app_metadata") or {}).get("roles", []),
        "criado_em": u.get("created_at"),
        "ultimo_acesso": u.get("last_sign_in_at"),
    }


def list_users() -> list[dict[str, Any]]:
    r = httpx.get(f"{_base()}/auth/v1/admin/users", headers=_headers(),
                  params={"per_page": 200}, timeout=20)
    r.raise_for_status()
    return [_slim(u) for u in (r.json().get("users") or [])]


def create_user(email: str, senha: str, nome: str, roles: list[str]) -> dict[str, Any]:
    """Cria um usuário já confirmado, com nome e papéis. Levanta ValueError em erro do Supabase."""
    payload = {
        "email": email,
        "password": senha,
        "email_confirm": True,
        "app_metadata": {"roles": roles},
        "user_metadata": {"nome": nome},
    }
    r = httpx.post(f"{_base()}/auth/v1/admin/users", headers=_headers(), json=payload, timeout=20)
    if r.status_code >= 400:
        detail = ""
        try:
            body = r.json()
            detail = body.get("msg") or body.get("error_description") or body.get("error") or str(body)
        except ValueError:
            detail = r.text[:200]
        raise ValueError(f"Supabase recusou a criação: {detail}")
    return _slim(r.json())


def update_roles(user_id: str, roles: list[str]) -> dict[str, Any]:
    r = httpx.put(f"{_base()}/auth/v1/admin/users/{user_id}", headers=_headers(),
                  json={"app_metadata": {"roles": roles}}, timeout=20)
    if r.status_code >= 400:
        raise ValueError(f"Supabase recusou a atualização: {r.text[:200]}")
    return _slim(r.json())


def delete_user(user_id: str) -> None:
    r = httpx.delete(f"{_base()}/auth/v1/admin/users/{user_id}", headers=_headers(), timeout=20)
    if r.status_code >= 400:
        raise ValueError(f"Supabase recusou a remoção: {r.text[:200]}")
