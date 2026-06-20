"""Copiloto operável por linguagem natural (#63).

O LLM apenas PROPÕE uma ação de escrita; a execução é um passo separado,
confirmado pelo humano e rodado sob a identidade/RBAC do usuário logado (a
auditoria registra a pessoa real, não o ator 'mcp'). Cada ação valida os
argumentos pelo schema do domínio correspondente e checa o papel exigido.
"""
from __future__ import annotations

from typing import Any

from app.domain.evaluation import schemas as esch
from app.domain.evaluation import service as esvc
from app.domain.registry import schemas as rsch
from app.domain.registry import service as rsvc

# Catálogo de ações de ESCRITA disponíveis ao copiloto, com o papel exigido.
ACOES: dict[str, dict[str, Any]] = {
    "registrar_ferramenta": {
        "roles": ("owner_ferramenta", "coordenador_comite", "admin"),
        "desc": (
            "registra ferramenta/agente de IA. args: codigo_institucional, nome, "
            "tipo (ferramenta|agente), unidade_responsavel, descricao?, "
            "categoria_risco? (alto|baixo)"
        ),
    },
    "criar_modelo_base": {
        "roles": ("owner_ferramenta", "coordenador_comite", "admin"),
        "desc": (
            "registra modelo-base. args: provedor, nome, versao, "
            "hospedagem (api_externa|on_premise|nuvem_homologada)"
        ),
    },
    "anotar_saida": {
        "roles": ("avaliador", "owner_ferramenta", "coordenador_comite", "admin"),
        "desc": (
            "registra anotação humana de uma saída avaliada. args: eval_output_id, "
            "label (aceite|correcao|rejeicao), texto_corrigido?, marcou_alucinacao? (bool), "
            "justificativa?"
        ),
    },
    "decidir_gate": {
        "roles": ("coordenador_comite", "admin"),
        "desc": "homologa um gate de promoção. args: gate_id, aprovar (bool), justificativa",
    },
}

# Bloco textual das ações, injetado no prompt do planejador.
CATALOGO_PROMPT = "\n".join(f"- {nome} — {a['desc']}" for nome, a in ACOES.items())


def acao_existe(ferramenta: str | None) -> bool:
    return ferramenta in ACOES


def executar(conn: Any, user: Any, ferramenta: str, args: dict[str, Any]) -> dict:
    """Executa a ação confirmada sob a identidade do usuário (RBAC + auditoria).

    Levanta: ValueError (ação desconhecida/argumento ausente), PermissionError
    (papel insuficiente ou regra de negócio, ex.: gate reprovado). A validação
    de campos é feita pelos schemas do domínio (ValidationError do pydantic).
    """
    spec = ACOES.get(ferramenta)
    if spec is None:
        raise ValueError(f"Ação desconhecida: {ferramenta}")
    if not user.has_any(*spec["roles"]):
        raise PermissionError(f"Seu papel não permite a ação '{ferramenta}'.")

    dados = dict(args or {})
    if ferramenta == "registrar_ferramenta":
        return rsvc.create_tool(conn, rsch.ToolCreate(**dados), owner_sub=user.sub)
    if ferramenta == "criar_modelo_base":
        return rsvc.create_model_base(conn, rsch.ModelBaseCreate(**dados))
    if ferramenta == "anotar_saida":
        return esvc.create_annotation(conn, esch.AnnotationCreate(**dados), annotator_sub=user.sub)
    if ferramenta == "decidir_gate":
        gate_id = dados.pop("gate_id", None)
        if not gate_id:
            raise ValueError("decidir_gate requer 'gate_id'.")
        return esvc.decide_gate(conn, gate_id, esch.GateDecide(**dados), aprovador_sub=user.sub)
    raise ValueError(f"Ação não implementada: {ferramenta}")  # pragma: no cover
