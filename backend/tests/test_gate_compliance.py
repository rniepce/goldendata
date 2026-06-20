"""Testes dos bloqueios de conformidade do gate (#34/#4) e do contrato de resposta."""
from __future__ import annotations

from app.domain.evaluation.gate import compliance_blocks
from app.domain.evaluation.service import _gate_response


def test_sem_bloqueios():
    assert compliance_blocks({}, [], set()) == []
    assert compliance_blocks(None, [{"ripd_requerido": False}], {"aia"}) == []


def test_vedacao_aplicavel_bloqueia():
    blocks = compliance_blocks({"decisao_autonoma": True, "treino_com_sigilo": False}, [], set())
    chaves = [b["chave"] for b in blocks]
    assert chaves == ["decisao_autonoma"]
    assert blocks[0]["tipo"] == "vedacao"


def test_ripd_requerido_sem_anexo_bloqueia():
    blocks = compliance_blocks({}, [{"ripd_requerido": True}], set())
    assert len(blocks) == 1 and blocks[0]["tipo"] == "ripd"


def test_ripd_requerido_com_anexo_aia_nao_bloqueia():
    assert compliance_blocks({}, [{"ripd_requerido": True}], {"aia"}) == []
    assert compliance_blocks({}, [{"ripd_requerido": True}], {"ripd"}) == []


def test_gate_response_reprova_com_bloqueio_mesmo_metricas_ok():
    row = {
        "metricas_exigidas": {"taxa_aceitacao": 0.8},
        "metricas_obtidas": {"taxa_aceitacao": 0.95},  # passaria nas métricas
        "bloqueios": [{"tipo": "vedacao", "chave": "decisao_autonoma", "detalhe": "x"}],
        "resultado": "reprovado",
        "aprovador_sub": None,
    }
    resp = _gate_response(row)
    assert resp["aprovado_automatico"] is False  # bloqueio derruba mesmo com métrica ok
    assert resp["decisao"] is None  # sem homologação humana ainda
    assert len(resp["checks"]) == 1 and resp["checks"][0]["passou"] is True


def test_gate_response_aprova_sem_bloqueio_e_metricas_ok():
    row = {
        "metricas_exigidas": {"taxa_aceitacao": 0.8},
        "metricas_obtidas": {"taxa_aceitacao": 0.9},
        "bloqueios": [],
        "resultado": "aprovado",
        "aprovador_sub": "u1",
    }
    resp = _gate_response(row)
    assert resp["aprovado_automatico"] is True
    assert resp["decisao"] == "aprovado"  # aprovador registrado
