"""Rotas das Iniciativas do GEX-IA (Painel/portfólio)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

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
