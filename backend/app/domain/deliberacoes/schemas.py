"""Schemas das deliberações com voto nominal (#38)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

VotoValor = Literal["favoravel", "contrario", "abstencao", "impedido"]


class DeliberacaoCreate(BaseModel):
    titulo: str = Field(min_length=1)
    pauta: str | None = None
    relator_email: str | None = None
    iniciativa_id: str | None = None
    tool_id: str | None = None


class VotoRegistrar(BaseModel):
    membro_email: str = Field(min_length=1)
    membro_nome: str | None = None
    valor: VotoValor


class DeliberacaoEncerrar(BaseModel):
    resultado: str | None = None
