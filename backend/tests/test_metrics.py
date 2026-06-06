from app.metrics import (
    check_citations,
    exact_match,
    extract_citations,
    levenshtein,
    normalized_similarity,
)


def test_levenshtein_basic():
    assert levenshtein("", "") == 0
    assert levenshtein("abc", "abc") == 0
    assert levenshtein("kitten", "sitting") == 3
    assert levenshtein("abc", "") == 3
    assert levenshtein("", "abc") == 3


def test_similarity_bounds_and_normalization():
    assert normalized_similarity("texto", "texto") == 1.0
    assert normalized_similarity("Texto  Igual", "texto igual") == 1.0  # normaliza espaço/caixa
    assert 0.0 <= normalized_similarity("abcdef", "uvwxyz") < 1.0


def test_exact_match():
    assert exact_match("A decisão.", "a decisão.") is True
    assert exact_match("um", "dois") is False


def test_extract_citations():
    txt = "Conforme a Súmula 7 e a Lei nº 8.112/1990, art. 5º, e o RE 123456."
    cits = extract_citations(txt)
    joined = " | ".join(cits).lower()
    assert "súmula 7" in joined
    assert "lei nº 8.112/1990" in joined
    assert "art. 5º" in joined


def test_check_citations_detects_hallucination():
    gerado = "Aplica-se a Súmula 7 e a Súmula 999."
    canonical = ["Súmula 7"]
    results = {r.citacao.lower(): r.status for r in check_citations(gerado, canonical)}
    assert results["súmula 7"] == "existe"
    assert results["súmula 999"] == "inexistente"
