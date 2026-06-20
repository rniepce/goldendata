"""Rotas do balcão de demandas (#37). Criar/listar p/ membros; triagem p/ coordenador."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import Ctx, get_ctx
from app.core.security_keycloak import require_role

from . import schemas, service

router = APIRouter(prefix="/demandas", tags=["demandas (intake)"])

_READ = require_role("owner_ferramenta", "coordenador_comite", "avaliador", "auditor_dpo", "admin")
_CREATE = require_role("owner_ferramenta", "coordenador_comite", "avaliador", "admin")
_TRIAGE = require_role("coordenador_comite", "admin")


@router.get("")
def list_demandas(status: str | None = None, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    return service.list_demandas(ctx.conn, status)


@router.post("", status_code=201)
def create_demanda(body: schemas.DemandaCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_CREATE)):
    return service.create_demanda(ctx.conn, body, criado_por_sub=ctx.user.sub)


@router.post("/{demanda_id}/triagem")
def triar(
    demanda_id: str, body: schemas.DemandaTriagem, ctx: Ctx = Depends(get_ctx), _=Depends(_TRIAGE)
):
    item = service.triar(ctx.conn, demanda_id, body, ator_sub=ctx.user.sub)
    if item is None:
        raise HTTPException(404, "Demanda não encontrada")
    return item
