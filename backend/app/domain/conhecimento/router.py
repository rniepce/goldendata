"""Rotas da base de conhecimento (corpus institucional do RAG).

Leitura liberada a todos os papéis (o assistente cita estes documentos); a
curadoria (criar/editar/remover/reindexar) é restrita a coordenador/admin —
o corpus institucional é sensível.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import Ctx, get_ctx
from app.core.security_keycloak import require_role

from . import schemas, service

router = APIRouter(prefix="/conhecimento", tags=["conhecimento (RAG)"])

_READ = require_role("owner_ferramenta", "coordenador_comite", "avaliador", "auditor_dpo", "admin")
_EDIT = require_role("coordenador_comite", "admin")


@router.get("")
def list_documentos(
    tipo: str | None = None,
    q: str | None = None,
    ctx: Ctx = Depends(get_ctx),
    _=Depends(_READ),
):
    return service.list_documentos(ctx.conn, tipo, q)


@router.get("/{documento_id}")
def get_documento(documento_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    item = service.get_documento(ctx.conn, documento_id)
    if item is None:
        raise HTTPException(404, "Documento não encontrado")
    return item


@router.post("", status_code=201)
def create_documento(body: schemas.DocumentoCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)):
    return service.create_documento(ctx.conn, body, criado_por_sub=ctx.user.sub)


@router.patch("/{documento_id}")
def update_documento(
    documento_id: str, body: schemas.DocumentoUpdate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)
):
    item = service.update_documento(ctx.conn, documento_id, body)
    if item is None:
        raise HTTPException(404, "Documento não encontrado")
    return item


@router.delete("/{documento_id}", status_code=204)
def delete_documento(documento_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)):
    if not service.delete_documento(ctx.conn, documento_id):
        raise HTTPException(404, "Documento não encontrado")


@router.post("/{documento_id}/reindex")
def reindex_documento(documento_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)):
    if service.get_documento(ctx.conn, documento_id) is None:
        raise HTTPException(404, "Documento não encontrado")
    n = service.reindex(ctx.conn, documento_id)
    return {"documento_id": documento_id, "chunks": n}
