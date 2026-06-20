"""Rotas dos encaminhamentos (#42)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import Ctx, get_ctx
from app.core.security_keycloak import require_role

from . import schemas, service

router = APIRouter(prefix="/encaminhamentos", tags=["encaminhamentos"])

_READ = require_role("owner_ferramenta", "coordenador_comite", "avaliador", "auditor_dpo", "admin")
_EDIT = require_role("owner_ferramenta", "coordenador_comite", "admin")


@router.get("")
def list_encaminhamentos(
    responsavel: str | None = None,
    status: str | None = None,
    ctx: Ctx = Depends(get_ctx),
    _=Depends(_READ),
):
    return service.list_encaminhamentos(ctx.conn, responsavel, status)


@router.post("", status_code=201)
def create_encaminhamento(
    body: schemas.EncaminhamentoCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)
):
    return service.create_encaminhamento(ctx.conn, body, criado_por_sub=ctx.user.sub)


@router.patch("/{enc_id}")
def update_encaminhamento(
    enc_id: str, body: schemas.EncaminhamentoUpdate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)
):
    item = service.update_encaminhamento(ctx.conn, enc_id, body)
    if item is None:
        raise HTTPException(404, "Encaminhamento não encontrado")
    return item
