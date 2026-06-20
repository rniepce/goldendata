"""Schemas dos encaminhamentos (#42)."""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

Status = Literal["aberto", "feito", "cancelado"]


class EncaminhamentoCreate(BaseModel):
    descricao: str = Field(min_length=1)
    responsavel_email: str | None = None
    responsavel_nome: str | None = None
    prazo: date | None = None
    origem: str | None = None
    iniciativa_id: str | None = None


class EncaminhamentoUpdate(BaseModel):
    status: Status | None = None
    descricao: str | None = Field(default=None, min_length=1)
    responsavel_email: str | None = None
    responsavel_nome: str | None = None
    prazo: date | None = None
    origem: str | None = None
