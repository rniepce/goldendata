"""Schemas (Pydantic) da Avaliação Contínua de Qualidade (3.3)."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

DatasetDomain = Literal["minuta", "despacho", "decisao", "relatorio", "sentenca", "outro"]
CaseOrigin = Literal["sintetico", "producao"]
RubricScale = Literal["binaria", "escala_3", "escala_5"]
AnnotationLabel = Literal["aceite", "correcao", "rejeicao"]


class RubricCreate(BaseModel):
    nome: str
    versao: str
    escala: RubricScale
    dimensoes: list[dict[str, Any]] = Field(default_factory=list)
    labels: dict[str, Any] = Field(default_factory=dict)


class GoldenDatasetCreate(BaseModel):
    tool_id: str
    nome: str
    dominio: DatasetDomain
    versao: str
    parent_version: str | None = None
    changelog: str | None = None
    origem_predominante: CaseOrigin = "sintetico"


class GoldenCaseCreate(BaseModel):
    input_prompt: str
    saida_referencia: str
    contexto_grounding: dict[str, Any] = Field(default_factory=dict)
    rubrica_id: str | None = None
    criterios_aceitacao: str | None = None
    dificuldade: int | None = Field(default=None, ge=1, le=5)
    categoria_risco: Literal["alto", "baixo"] | None = None
    contem_pii: bool = False
    origem: CaseOrigin = "sintetico"
    citacoes_canonicas: list[str] = Field(default_factory=list)


class EvalRunCreate(BaseModel):
    tool_version_id: str
    golden_dataset_id: str
    baseline_run_id: str | None = None


class OutputItem(BaseModel):
    golden_case_id: str
    texto_gerado: str
    fonte_geracao: str | None = None


class OutputImport(BaseModel):
    outputs: list[OutputItem]


class AnnotationCreate(BaseModel):
    eval_output_id: str
    label: AnnotationLabel
    texto_corrigido: str | None = None
    marcou_alucinacao: bool = False
    justificativa: str | None = None
    rubric_version: str | None = None


class GateCreate(BaseModel):
    eval_run_id: str
    metricas_exigidas: dict[str, float]


class GateDecide(BaseModel):
    aprovar: bool
    justificativa: str
