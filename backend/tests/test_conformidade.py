"""Testes do checklist determinístico de conformidade (#24)."""
from __future__ import annotations

from datetime import date, timedelta

from app.domain.assistente.conformidade import NA, OK, PENDENTE, avaliar_conformidade

HOJE = date(2026, 6, 20)


def _status(itens: list[dict], requisito_prefixo: str) -> str:
    for i in itens:
        if i["requisito"].startswith(requisito_prefixo):
            return i["status"]
    raise AssertionError(f"requisito não encontrado: {requisito_prefixo}")


def test_ficha_vazia_tudo_pendente_menos_ripd_nao_requerido():
    ficha = {"ferramenta": {}, "data_inventory": [], "tool_versions": [], "attachments": []}
    itens = avaliar_conformidade(ficha, [], set(), HOJE)
    assert _status(itens, "Classificação de risco") == PENDENTE
    assert _status(itens, "Explicação em linguagem") == PENDENTE
    assert _status(itens, "Inventário de dados") == PENDENTE
    assert _status(itens, "Versão registrada") == PENDENTE
    assert _status(itens, "Gate de promoção") == PENDENTE
    assert _status(itens, "Revisão periódica") == PENDENTE
    # Sem inventário, não há RIPD requerido → item N/A (não pendente).
    assert _status(itens, "RIPD/AIA") == NA


def test_ficha_completa_tudo_ok():
    ficha = {
        "ferramenta": {
            "categoria_risco": "alto",
            "explicacao_linguagem_simples": "Apoia a redação de despachos.",
            "grau_supervisao_humana": "validação obrigatória",
            "proxima_revisao_em": HOJE + timedelta(days=200),
        },
        "data_inventory": [{"ripd_requerido": True}],
        "tool_versions": [{"id": "v1"}],
        "attachments": [{"tipo": "aia"}],
    }
    itens = avaliar_conformidade(ficha, ["reprovado", "aprovado"], {"aia"}, HOJE)
    assert all(i["status"] in (OK, NA) for i in itens)
    assert _status(itens, "RIPD/AIA") == OK
    assert _status(itens, "Gate de promoção") == OK


def test_ripd_requerido_sem_anexo_fica_pendente():
    ficha = {
        "ferramenta": {"categoria_risco": "baixo"},
        "data_inventory": [{"ripd_requerido": True}],
        "tool_versions": [],
        "attachments": [],
    }
    itens = avaliar_conformidade(ficha, [], set(), HOJE)
    assert _status(itens, "RIPD/AIA") == PENDENTE


def test_revisao_vencida_fica_pendente():
    ficha = {
        "ferramenta": {"proxima_revisao_em": HOJE - timedelta(days=1)},
        "data_inventory": [],
        "tool_versions": [],
        "attachments": [],
    }
    itens = avaliar_conformidade(ficha, [], set(), HOJE)
    assert _status(itens, "Revisão periódica") == PENDENTE


def test_gate_pendente_sem_aprovacao():
    ficha = {"ferramenta": {}, "data_inventory": [], "tool_versions": [], "attachments": []}
    itens = avaliar_conformidade(ficha, ["pendente", "reprovado"], set(), HOJE)
    assert _status(itens, "Gate de promoção") == PENDENTE
