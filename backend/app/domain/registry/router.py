"""Rotas do Registro de Modelos e Ficha Técnica (3.2)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import Ctx, get_ctx
from app.core.security_keycloak import require_role

from . import schemas, service

router = APIRouter(prefix="/registry", tags=["registro (3.2)"])

# Papéis que podem manter a ficha técnica.
_EDIT = require_role("owner_ferramenta", "coordenador_comite", "admin")
_READ = require_role("owner_ferramenta", "coordenador_comite", "avaliador", "auditor_dpo", "admin")


@router.post("/model-bases", status_code=201)
def create_model_base(body: schemas.ModelBaseCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)):
    return service.create_model_base(ctx.conn, body)


@router.get("/model-bases")
def list_model_bases(ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    return service.list_model_bases(ctx.conn)


@router.post("/tools", status_code=201)
def create_tool(body: schemas.ToolCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)):
    return service.create_tool(ctx.conn, body, owner_sub=ctx.user.sub)


@router.get("/tools")
def list_tools(ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    return service.list_tools(ctx.conn)


@router.patch("/tools/{tool_id}")
def update_tool(tool_id: str, body: schemas.ToolUpdate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)):
    _ensure_tool(ctx, tool_id)
    return service.update_tool(ctx.conn, tool_id, body)


@router.get("/tools/{tool_id}/saude")
def tool_saude(tool_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    saude = service.tool_saude(ctx.conn, tool_id)
    if saude is None:
        raise HTTPException(404, "Ferramenta não encontrada")
    return saude


@router.get("/tools/{tool_id}/ficha")
def get_ficha(tool_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    ficha = service.get_ficha_tecnica(ctx.conn, tool_id)
    if ficha is None:
        raise HTTPException(404, "Ferramenta não encontrada")
    return ficha


@router.post("/tools/{tool_id}/prompt-versions", status_code=201)
def create_prompt_version(
    tool_id: str, body: schemas.PromptVersionCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)
):
    _ensure_tool(ctx, tool_id)
    return service.create_prompt_version(ctx.conn, tool_id, body, autor_sub=ctx.user.sub)


@router.post("/tools/{tool_id}/versions", status_code=201)
def create_tool_version(
    tool_id: str, body: schemas.ToolVersionCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)
):
    _ensure_tool(ctx, tool_id)
    return service.create_tool_version(ctx.conn, tool_id, body, criado_por_sub=ctx.user.sub)


@router.post("/tools/{tool_id}/data-inventory", status_code=201)
def add_data_inventory(
    tool_id: str, body: schemas.DataInventoryCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)
):
    _ensure_tool(ctx, tool_id)
    return service.add_data_inventory(ctx.conn, tool_id, body)


def _ensure_tool(ctx: Ctx, tool_id: str) -> None:
    if service.get_tool(ctx.conn, tool_id) is None:
        raise HTTPException(404, "Ferramenta não encontrada")
