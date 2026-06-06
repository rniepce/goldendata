"""Governança: leitura da trilha de auditoria, atribuição de papéis (RBAC) e
verificação de integridade da cadeia de hashes. Acesso restrito (auditor/DPO,
coordenador, admin) — CESEC §2.4/§3."""
from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.db import execute, fetch_all
from app.core.deps import Ctx, get_ctx
from app.core.security_keycloak import require_role

router = APIRouter(prefix="/governance", tags=["governança"])

_AUDIT = require_role("auditor_dpo", "coordenador_comite", "admin")
_ADMIN = require_role("admin", "coordenador_comite")


class RoleAssignmentCreate(BaseModel):
    user_sub: str
    role: Literal["coordenador_comite", "owner_ferramenta", "avaliador", "auditor_dpo", "admin"]
    tool_id: str | None = None
    via_delegacao: bool = False
    delegado_por_sub: str | None = None
    vigencia_fim: str | None = None


@router.get("/audit-log")
def audit_log(
    entidade: str | None = None,
    entidade_id: str | None = None,
    limite: int = 200,
    ctx: Ctx = Depends(get_ctx),
    _=Depends(_AUDIT),
):
    sql = "SELECT * FROM audit_log"
    params: list[Any] = []
    if entidade:
        sql += " WHERE entidade = %s"
        params.append(entidade)
        if entidade_id:
            sql += " AND entidade_id = %s"
            params.append(entidade_id)
    sql += " ORDER BY id DESC LIMIT %s"
    params.append(min(limite, 1000))
    return fetch_all(ctx.conn, sql, tuple(params))


@router.get("/audit-log/verify")
def verify_chain(ctx: Ctx = Depends(get_ctx), _=Depends(_AUDIT)):
    """Verifica a continuidade da cadeia de hashes (prev_hash de cada registro
    deve igualar o hash do anterior). Detecta remoção/adulteração."""
    rows = fetch_all(ctx.conn, "SELECT id, prev_hash, hash FROM audit_log ORDER BY id")
    quebras = []
    anterior = None
    for r in rows:
        if anterior is not None and r["prev_hash"] != anterior:
            quebras.append(r["id"])
        anterior = r["hash"]
    return {"total": len(rows), "intacta": not quebras, "quebras": quebras}


@router.post("/role-assignments", status_code=201)
def assign_role(body: RoleAssignmentCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_ADMIN)):
    return execute(
        ctx.conn,
        """INSERT INTO role_assignment (user_sub, role, tool_id, via_delegacao,
              delegado_por_sub, vigencia_fim)
           VALUES (%s,%s,%s,%s,%s,%s) RETURNING *""",
        (body.user_sub, body.role, body.tool_id, body.via_delegacao,
         body.delegado_por_sub, body.vigencia_fim),
    )
