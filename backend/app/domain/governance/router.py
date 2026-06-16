"""Governança: leitura da trilha de auditoria, atribuição de papéis (RBAC) e
verificação de integridade da cadeia de hashes. Acesso restrito (auditor/DPO,
coordenador, admin) — CESEC §2.4/§3."""
from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from app.core import supabase_admin
from app.core.db import execute, fetch_all
from app.core.deps import Ctx, get_ctx
from app.core.security_keycloak import require_role

router = APIRouter(prefix="/governance", tags=["governança"])

_AUDIT = require_role("auditor_dpo", "coordenador_comite", "admin")
_ADMIN = require_role("admin", "coordenador_comite")

RbacRole = Literal["coordenador_comite", "owner_ferramenta", "avaliador", "auditor_dpo", "admin"]


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


class SupabaseUserCreate(BaseModel):
    email: str
    nome: str
    senha: str = Field(min_length=8)
    roles: list[RbacRole] = Field(min_length=1)


class SupabaseUserRoles(BaseModel):
    roles: list[RbacRole] = Field(min_length=1)


@router.get("/users")
def list_supabase_users(ctx: Ctx = Depends(get_ctx), _=Depends(_ADMIN)):
    """Lista os usuários do Supabase Auth (gestão de logins)."""
    try:
        return supabase_admin.list_users()
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.post("/users", status_code=201)
def create_supabase_user(body: SupabaseUserCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_ADMIN)):
    """Cria um usuário no Supabase Auth com papéis (RBAC). Registra na auditoria."""
    try:
        user = supabase_admin.create_user(body.email, body.senha, body.nome, list(body.roles))
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    execute(
        ctx.conn,
        "SELECT audit_append(%s, 'create', 'supabase_user', %s, %s)",
        (ctx.user.sub, user.get("id") or body.email,
         Jsonb({"email": body.email, "roles": list(body.roles)})),
    )
    return user


@router.put("/users/{user_id}/roles")
def update_supabase_user_roles(
    user_id: str, body: SupabaseUserRoles, ctx: Ctx = Depends(get_ctx), _=Depends(_ADMIN)
):
    try:
        return supabase_admin.update_roles(user_id, list(body.roles))
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(400, str(exc)) from exc


@router.delete("/users/{user_id}", status_code=204)
def delete_supabase_user(user_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_ADMIN)):
    if user_id == ctx.user.sub:
        raise HTTPException(400, "Não é possível remover a própria conta.")
    try:
        supabase_admin.delete_user(user_id)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(400, str(exc)) from exc


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
