"""Testes de extração de texto e parsing tolerante de JSON (#76/#77)."""
from __future__ import annotations

from app.core.doctext import extrair_texto, parse_primeiro_json


def test_extrair_txt_e_md():
    assert extrair_texto("nota.txt", b"Diretriz X\nlinha 2").startswith("Diretriz X")
    assert "titulo" in extrair_texto("doc.md", b"# titulo\ncorpo")


def test_extrair_sem_extensao_decodifica():
    assert extrair_texto("", "acentuação".encode()) == "acentuação"


def test_parse_json_limpo():
    d = parse_primeiro_json('{"titulo": "X", "categoria": "suporte"}')
    assert d["titulo"] == "X" and d["categoria"] == "suporte"


def test_parse_json_cercado_de_texto():
    bruto = 'Claro! Aqui:\n```json\n{"titulo": "Y", "risco_sugerido": "alto"}\n```\nFim.'
    d = parse_primeiro_json(bruto)
    assert d["titulo"] == "Y" and d["risco_sugerido"] == "alto"


def test_parse_json_invalido_retorna_vazio():
    assert parse_primeiro_json("sem json aqui") == {}
    assert parse_primeiro_json("") == {}
