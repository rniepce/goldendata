"""Rotas das deliberações (#38)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import Ctx, get_ctx
from app.core.security_keycloak import require_role

from . import schemas, service

router = APIRouter(prefix="/deliberacoes", tags=["deliberações"])

_READ = require_role("owner_ferramenta", "coordenador_comite", "avaliador", "auditor_dpo", "admin")
_EDIT = require_role("coordenador_comite", "admin")  # abrir/encerrar deliberação
_VOTE = require_role("owner_ferramenta", "coordenador_comite", "avaliador", "admin")


@router.get("")
def list_deliberacoes(status: str | None = None, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    return service.list_deliberacoes(ctx.conn, status)


@router.get("/{deliberacao_id}")
def get_deliberacao(deliberacao_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    item = service.get_deliberacao(ctx.conn, deliberacao_id)
    if item is None:
        raise HTTPException(404, "Deliberação não encontrada")
    return item


@router.post("", status_code=201)
def create_deliberacao(
    body: schemas.DeliberacaoCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)
):
    return service.create_deliberacao(ctx.conn, body, criado_por_sub=ctx.user.sub)


@router.post("/{deliberacao_id}/votos")
def registrar_voto(
    deliberacao_id: str, body: schemas.VotoRegistrar, ctx: Ctx = Depends(get_ctx), _=Depends(_VOTE)
):
    item = service.registrar_voto(ctx.conn, deliberacao_id, body)
    if item is None:
        raise HTTPException(404, "Deliberação não encontrada")
    return item


@router.post("/{deliberacao_id}/encerrar")
def encerrar(
    deliberacao_id: str, body: schemas.DeliberacaoEncerrar, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)
):
    item = service.encerrar(ctx.conn, deliberacao_id, body)
    if item is None:
        raise HTTPException(404, "Deliberação não encontrada")
    return item
