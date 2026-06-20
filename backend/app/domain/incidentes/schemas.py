"""Schemas de incidentes (#1 — CNJ 615 Art. 42, SLA 72h)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class IncidenteCreate(BaseModel):
    tool_id: str
    descricao_evento: str = Field(min_length=1)
    causa: str | None = None
    medida_correcao: str | None = None
    identificado_em: datetime
    comunicado_em: datetime | None = None
    prazo_72h_cumprido: bool | None = None


class IncidenteUpdate(BaseModel):
    causa: str | None = None
    medida_correcao: str | None = None
    comunicado_em: datetime | None = None
    prazo_72h_cumprido: bool | None = None
