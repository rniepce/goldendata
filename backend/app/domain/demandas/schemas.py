"""Schemas do balcão de demandas (#37)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class DemandaCreate(BaseModel):
    unidade_demandante: str = Field(min_length=1)
    titulo: str = Field(min_length=1)
    problema: str | None = None
    processo_sei: str | None = None
    classificacao_risco_preliminar: str | None = None


class DemandaTriagem(BaseModel):
    acao: Literal["aceitar", "recusar", "devolver"]
    motivo: str | None = None  # justificativa (recusar/devolver)
    categoria: str | None = None  # categoria da iniciativa (ao aceitar)
