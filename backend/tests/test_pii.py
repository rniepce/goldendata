"""Testes do detector de PII vazada (#48)."""
from __future__ import annotations

from app.metrics.pii import pii_vazada


def test_cpf_vazado():
    assert "CPF" in pii_vazada("Decisão sobre 123.456.789-00.", "Decisão sobre o caso.")


def test_cpf_presente_na_referencia_nao_vaza():
    assert pii_vazada("CPF 123.456.789-00", "Referência com 123.456.789-00") == []


def test_email_vazado():
    assert "e-mail" in pii_vazada("contato fulano@tjmg.jus.br", "contato da parte")


def test_sem_pii():
    assert pii_vazada("Defiro o pedido de tutela de urgência.", "Defiro o pedido.") == []


def test_oab_vazada():
    assert "OAB" in pii_vazada("advogado OAB/MG 123456", "o advogado da parte")
