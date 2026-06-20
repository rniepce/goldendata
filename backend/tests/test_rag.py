"""Testes de lógica pura do RAG: chunking e montagem de contexto/fontes."""
from __future__ import annotations

from app.core.rag import build_context, chunk_text


def test_chunk_vazio():
    assert chunk_text("") == []
    assert chunk_text("   \n  ") == []


def test_chunk_paragrafo_curto_unico():
    chunks = chunk_text("Diretriz única do GEX-IA.")
    assert chunks == ["Diretriz única do GEX-IA."]


def test_chunk_agrupa_paragrafos_ate_o_limite():
    texto = "Parágrafo um.\n\nParágrafo dois.\n\nParágrafo três."
    # Limite alto: tudo cabe num chunk só.
    assert len(chunk_text(texto, max_chars=200)) == 1
    # Limite baixo: separa em mais de um chunk, cada um dentro do teto.
    chunks = chunk_text(texto, max_chars=20)
    assert len(chunks) >= 2
    assert all(len(c) <= 20 for c in chunks)


def test_chunk_paragrafo_longo_e_subdividido_por_sentenca():
    p = "Frase um é grande. " * 10  # ~190 chars, sem linha em branco
    chunks = chunk_text(p, max_chars=50)
    assert len(chunks) >= 3
    assert all(len(c) <= 50 for c in chunks)
    # Nenhum conteúdo se perde (todas as palavras-âncora presentes).
    assert "Frase" in " ".join(chunks)


def test_chunk_preserva_ordem_e_cobre_todo_o_texto():
    texto = "AAA.\n\nBBB.\n\nCCC."
    juntos = " ".join(chunk_text(texto, max_chars=8))
    assert juntos.index("AAA") < juntos.index("BBB") < juntos.index("CCC")


def test_build_context_dedup_fontes_por_documento():
    chunks = [
        {"documento_id": "d1", "titulo": "Diretriz A", "tipo": "diretriz", "texto": "trecho 1"},
        {"documento_id": "d1", "titulo": "Diretriz A", "tipo": "diretriz", "texto": "trecho 2"},
        {"documento_id": "d2", "titulo": "Norma B", "tipo": "norma", "texto": "trecho 3"},
    ]
    contexto, fontes = build_context(chunks)
    # Duas fontes distintas (d1, d2), numeradas na ordem de relevância.
    assert [f["documento_id"] for f in fontes] == ["d1", "d2"]
    assert "[1] (diretriz) Diretriz A" in contexto
    assert "[2] (norma) Norma B" in contexto
    # Ambos os trechos de d1 aparecem sob a mesma fonte [1].
    assert contexto.count("[1]") == 2


def test_build_context_vazio():
    assert build_context([]) == ("", [])
