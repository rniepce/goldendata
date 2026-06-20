"""Rotas da Avaliação Contínua de Qualidade (3.3)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import Ctx, get_ctx
from app.core.security_keycloak import require_role

from . import schemas, service

router = APIRouter(prefix="/evaluation", tags=["avaliação (3.3)"])

_EDIT = require_role("owner_ferramenta", "coordenador_comite", "admin")
_ANNOTATE = require_role("avaliador", "owner_ferramenta", "coordenador_comite", "admin")
_GATE_DECIDE = require_role("coordenador_comite", "admin")
_READ = require_role("owner_ferramenta", "coordenador_comite", "avaliador", "auditor_dpo", "admin")


@router.post("/rubrics", status_code=201)
def create_rubric(body: schemas.RubricCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)):
    return service.create_rubric(ctx.conn, body, autor_sub=ctx.user.sub)


@router.post("/golden-datasets", status_code=201)
def create_dataset(body: schemas.GoldenDatasetCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)):
    return service.create_golden_dataset(ctx.conn, body, criado_por_sub=ctx.user.sub)


@router.post("/golden-datasets/{dataset_id}/cases", status_code=201)
def add_case(dataset_id: str, body: schemas.GoldenCaseCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)):
    return service.add_golden_case(ctx.conn, dataset_id, body)


@router.post("/eval-runs", status_code=201)
def create_run(body: schemas.EvalRunCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)):
    return service.create_eval_run(ctx.conn, body, iniciado_por_sub=ctx.user.sub)


@router.post("/eval-runs/{run_id}/outputs")
def import_outputs(run_id: str, body: schemas.OutputImport, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)):
    try:
        return service.import_outputs(ctx.conn, run_id, body)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.get("/eval-runs/{run_id}")
def get_run(run_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    run = service.get_run(ctx.conn, run_id)
    if run is None:
        raise HTTPException(404, "Execução não encontrada")
    return run


@router.get("/eval-runs/{run_id}/fatias")
def get_fatias(
    run_id: str, eixo: str = "dificuldade", ctx: Ctx = Depends(get_ctx), _=Depends(_READ)
):
    try:
        return service.compute_aggregate_por_fatia(ctx.conn, run_id, eixo)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/annotations", status_code=201)
def annotate(body: schemas.AnnotationCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_ANNOTATE)):
    try:
        return service.create_annotation(ctx.conn, body, annotator_sub=ctx.user.sub)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/tools/{tool_id}/versions/{version_id}/kpi", status_code=201)
def compute_kpi(tool_id: str, version_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    return service.compute_kpi_for_version(ctx.conn, tool_id, version_id)


@router.get("/tools/{tool_id}/kpi")
def list_kpi(tool_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    return service.list_kpi(ctx.conn, tool_id)


@router.post("/versions/{version_id}/gate", status_code=201)
def create_gate(version_id: str, body: schemas.GateCreate, ctx: Ctx = Depends(get_ctx), _=Depends(_EDIT)):
    return service.create_gate(ctx.conn, body, version_id)


@router.post("/gates/{gate_id}/decide")
def decide_gate(gate_id: str, body: schemas.GateDecide, ctx: Ctx = Depends(get_ctx), _=Depends(_GATE_DECIDE)):
    try:
        return service.decide_gate(ctx.conn, gate_id, body, aprovador_sub=ctx.user.sub)
    except PermissionError as exc:
        raise HTTPException(409, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
