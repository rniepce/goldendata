"""Testes do copiloto operável (#63): catálogo, RBAC por ação e validação.

As checagens de ação desconhecida e de papel acontecem ANTES de tocar o banco,
então rodam com conn=None.
"""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.security_keycloak import CurrentUser
from app.domain.assistente import copiloto


def _user(*roles: str) -> CurrentUser:
    return CurrentUser(sub="u1", nome="U", email=None, roles=list(roles))


def test_acao_existe():
    assert copiloto.acao_existe("decidir_gate")
    assert copiloto.acao_existe("registrar_ferramenta")
    assert not copiloto.acao_existe("apagar_tudo")
    assert not copiloto.acao_existe(None)


def test_acao_desconhecida_levanta():
    with pytest.raises(ValueError):
        copiloto.executar(None, _user("admin"), "apagar_tudo", {})


def test_rbac_avaliador_nao_decide_gate():
    with pytest.raises(PermissionError):
        copiloto.executar(
            None,
            _user("avaliador"),
            "decidir_gate",
            {"gate_id": "g", "aprovar": True, "justificativa": "x"},
        )


def test_rbac_avaliador_nao_registra_ferramenta():
    with pytest.raises(PermissionError):
        copiloto.executar(None, _user("avaliador"), "registrar_ferramenta", {})


def test_args_invalidos_validam_antes_do_banco():
    # avaliador PODE anotar; com args vazios, o schema reprova (antes de usar conn).
    with pytest.raises(ValidationError):
        copiloto.executar(None, _user("avaliador"), "anotar_saida", {})


def test_decidir_gate_sem_gate_id():
    with pytest.raises(ValueError):
        copiloto.executar(
            None, _user("admin"), "decidir_gate", {"aprovar": True, "justificativa": "x"}
        )
