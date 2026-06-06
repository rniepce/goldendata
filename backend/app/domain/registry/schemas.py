"""Schemas (Pydantic) do Registro de Modelos e Ficha Técnica (3.2)."""
from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field

ToolType = Literal["ferramenta", "agente"]
RiskCategory = Literal["alto", "baixo"]
SupervisionLevel = Literal["humano_no_loop", "humano_sobre_o_loop", "sem_supervisao"]
ModelHosting = Literal["api_externa", "on_premise", "nuvem_homologada"]
DataNature = Literal["treino_finetuning", "rag_base", "contexto_runtime"]
BaseLegal = Literal[
    "funcao_jurisdicional", "obrigacao_legal", "politica_publica",
    "legitimo_interesse", "consentimento", "nao_se_aplica",
]


class ModelBaseCreate(BaseModel):
    provedor: str
    nome: str
    versao: str
    hospedagem: ModelHosting
    notas_conformidade: str | None = None


class ToolCreate(BaseModel):
    codigo_institucional: str
    nome: str
    tipo: ToolType
    descricao: str | None = None
    unidade_responsavel: str
    categoria_risco: RiskCategory | None = None
    justificativa_risco: str | None = None
    vedacoes_checklist: dict[str, Any] = Field(default_factory=dict)
    grau_supervisao_humana: SupervisionLevel = "humano_no_loop"
    revisao_humana_obrigatoria: bool = True
    explicacao_linguagem_simples: str | None = None
    sinapses_id: str | None = None
    proxima_revisao_em: date | None = None


class PromptVersionCreate(BaseModel):
    versao: str
    conteudo: str
    parent_version: str | None = None
    changelog: str | None = None


class ToolVersionCreate(BaseModel):
    versao: str
    model_base_id: str
    prompt_version_id: str | None = None
    config: dict[str, Any] = Field(default_factory=dict)
    git_commit: str | None = None
    changelog: str | None = None


class DataInventoryCreate(BaseModel):
    natureza: DataNature
    origem: str
    categorias_dados: list[str] = Field(default_factory=list)
    contem_dados_pessoais: bool = False
    contem_dados_sensiveis: bool = False
    contem_dados_criancas: bool = False
    contem_sigilo: bool = False
    base_legal: BaseLegal
    tecnicas_protecao: dict[str, Any] = Field(default_factory=dict)
    retencao_criterio: str | None = None
    descarte_programado_em: date | None = None
    finalidade_exclusiva_jurisdicional: bool = False
    ripd_requerido: bool = False
