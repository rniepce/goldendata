"""Rota do cockpit de pendências do comitê (#13)."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.deps import Ctx, get_ctx
from app.core.security_keycloak import require_role

from . import service

router = APIRouter(prefix="/cockpit", tags=["cockpit"])

_READ = require_role("owner_ferramenta", "coordenador_comite", "avaliador", "auditor_dpo", "admin")


@router.get("")
def cockpit(ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    return service.get_cockpit(ctx.conn)
