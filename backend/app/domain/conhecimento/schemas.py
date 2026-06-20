"""Schemas da base de conhecimento (corpus do RAG)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Tipo = Literal["skill", "norma", "diretriz", "modelo_resposta", "outro"]


class DocumentoCreate(BaseModel):
    titulo: str = Field(min_length=1)
    tipo: Tipo = "skill"
    conteudo: str = Field(min_length=1)
    fonte: str | None = None
    tags: list[str] = Field(default_factory=list)
    ativo: bool = True


class DocumentoUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=1)
    tipo: Tipo | None = None
    conteudo: str | None = Field(default=None, min_length=1)
    fonte: str | None = None
    tags: list[str] | None = None
    ativo: bool | None = None
