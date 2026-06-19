"""Rotas das Iniciativas do GEX-IA (Painel/portfólio)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb

from app.core.db import execute
from app.core.deps import Ctx, get_ctx
from app.core.security_keycloak import require_role

from . import schemas, service

router = APIRouter(prefix="/iniciativas", tags=["iniciativas (painel)"])

_READ = require_role("owner_ferramenta", "coordenador_comite", "avaliador", "auditor_dpo", "admin")
_EDIT = require_role("owner_ferramenta", "coordenador_comite", "admin")


@router.get("")
def list_iniciativas(
    categoria: str | None = None,
    status: str | None = None,
    responsavel: str | None = None,
    ctx: Ctx = Depends(get_ctx),
    _=Depends(_READ),
):
    return service.list_iniciativas(ctx.conn, categoria, status, responsavel)


@router.get("/{iniciativa_id}")
def get_iniciativa(iniciativa_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    item = service.get_iniciativa(ctx.conn, iniciativa_id)
    if item is None:
        raise HTTPException(404, "Iniciativa não encontrada")
    return item


@router.post("", status_code=201)
def create_iniciativa(body: schemas.IniciativaCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)):
    return service.create_iniciativa(ctx.conn, body, criado_por_sub=ctx.user.sub)


@router.patch("/{iniciativa_id}")
def update_iniciativa(
    iniciativa_id: str, body: schemas.IniciativaUpdate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)
):
    item = service.update_iniciativa(ctx.conn, iniciativa_id, body)
    if item is None:
        raise HTTPException(404, "Iniciativa não encontrada")
    return item


@router.delete("/{iniciativa_id}", status_code=204)
def delete_iniciativa(iniciativa_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)):
    if not service.delete_iniciativa(ctx.conn, iniciativa_id):
        raise HTTPException(404, "Iniciativa não encontrada")


# ---------------- Comentários / discussão ----------------
@router.get("/{iniciativa_id}/comentarios")
def list_comentarios(iniciativa_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    return service.list_comentarios(ctx.conn, iniciativa_id)


@router.post("/{iniciativa_id}/comentarios", status_code=201)
def add_comentario(
    iniciativa_id: str, body: schemas.ComentarioCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)
):
    if service.get_iniciativa(ctx.conn, iniciativa_id) is None:
        raise HTTPException(404, "Iniciativa não encontrada")
    c = service.create_comentario(ctx.conn, iniciativa_id, body, ctx.user.sub, ctx.user.nome)
    execute(
        ctx.conn,
        "SELECT audit_append(%s, 'create', 'comentario', %s, %s)",
        (ctx.user.sub, c["id"], Jsonb({"iniciativa_id": iniciativa_id})),
    )
    return c


@router.patch("/comentarios/{comentario_id}")
def resolver_comentario(
    comentario_id: str, body: schemas.ComentarioUpdate, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)
):
    c = service.set_resolvido(ctx.conn, comentario_id, body.resolvido)
    if c is None:
        raise HTTPException(404, "Comentário não encontrado")
    return c


@router.delete("/comentarios/{comentario_id}", status_code=204)
def delete_comentario(comentario_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    c = service.get_comentario(ctx.conn, comentario_id)
    if c is None:
        raise HTTPException(404, "Comentário não encontrado")
    # autor remove o próprio; coordenador/admin removem qualquer um.
    if c["autor_sub"] != ctx.user.sub and not ctx.user.has_any("coordenador_comite", "admin"):
        raise HTTPException(403, "Sem permissão para remover este comentário")
    service.delete_comentario(ctx.conn, comentario_id)
