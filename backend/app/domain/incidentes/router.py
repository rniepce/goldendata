"""Rotas de incidentes (#1 — SLA 72h, CNJ 615 Art. 42)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import Ctx, get_ctx
from app.core.security_keycloak import require_role

from . import schemas, service

router = APIRouter(prefix="/incidentes", tags=["incidentes"])

_READ = require_role("owner_ferramenta", "coordenador_comite", "avaliador", "auditor_dpo", "admin")
_EDIT = require_role("owner_ferramenta", "coordenador_comite", "admin")


@router.get("")
def list_incidentes(tool_id: str | None = None, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    return service.list_incidentes(ctx.conn, tool_id)


@router.post("", status_code=201)
def create_incidente(body: schemas.IncidenteCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)):
    return service.create_incidente(ctx.conn, body, reportado_por_sub=ctx.user.sub)


@router.patch("/{inc_id}")
def update_incidente(
    inc_id: str, body: schemas.IncidenteUpdate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)
):
    item = service.update_incidente(ctx.conn, inc_id, body)
    if item is None:
        raise HTTPException(404, "Incidente não encontrado")
    return item
