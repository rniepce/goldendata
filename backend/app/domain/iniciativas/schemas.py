"""Schemas das Iniciativas do GEX-IA (portfólio de trabalho)."""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

Categoria = Literal[
    "solucao_ia", "educacional", "suporte",
    "governanca_normativo", "cooperacao", "pesquisa_prospeccao",
]
Status = Literal["a_fazer", "em_andamento", "em_pausa", "concluido", "cancelado"]
Prioridade = Literal["baixa", "media", "alta"]


class IniciativaCreate(BaseModel):
    titulo: str = Field(min_length=1)
    resumo: str | None = None
    categoria: Categoria
    status: Status = "em_andamento"
    prioridade: Prioridade = "media"
    responsavel_email: str | None = None
    responsavel_nome: str | None = None
    tool_id: str | None = None
    processo_sei: str | None = None
    prazo: date | None = None


class ComentarioCreate(BaseModel):
    texto: str = Field(min_length=1)
    anexo_url: str | None = None
    anexo_titulo: str | None = None


class ComentarioUpdate(BaseModel):
    resolvido: bool


class IniciativaUpdate(BaseModel):
    titulo: str | None = None
    resumo: str | None = None
    categoria: Categoria | None = None
    status: Status | None = None
    prioridade: Prioridade | None = None
    responsavel_email: str | None = None
    responsavel_nome: str | None = None
    tool_id: str | None = None
    processo_sei: str | None = None
    prazo: date | None = None
