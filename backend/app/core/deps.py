"""Dependências FastAPI compartilhadas: conexão com contexto de auditoria."""
from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass

from fastapi import Depends, Request

from .db import connection
from .security_keycloak import CurrentUser, get_current_user


def client_ip(request: Request) -> str | None:
    """IP de origem respeitando proxies (RFC 7239 / X-Forwarded-For) — CESEC §3."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


@dataclass
class Ctx:
    conn: object
    user: CurrentUser


def get_ctx(request: Request, user: CurrentUser = Depends(get_current_user)) -> Iterator[Ctx]:
    """Abre uma transação por requisição já com o ator/origem/agente injetados,
    para que a trigger de auditoria registre quem/onde/como."""
    with connection(user.sub, client_ip(request), request.headers.get("user-agent")) as conn:
        yield Ctx(conn=conn, user=user)
