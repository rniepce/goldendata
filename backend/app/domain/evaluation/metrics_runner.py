"""Cálculo de métricas sobre saídas importadas (store-only).

Recebe pares (caso de referência, saída gerada) e produz scores por avaliador
determinístico/estatístico, além de uma agregação por execução. Lógica pura —
não acessa banco nem chama modelos.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.metrics import (
    check_citations,
    exact_match,
    extract_citations,
    levenshtein,
    normalized_similarity,
)


@dataclass
class CasePair:
    golden_case_id: str
    referencia: str
    gerado: str
    citacoes_canonicas: list[str] = field(default_factory=list)


@dataclass
class CaseScores:
    golden_case_id: str
    exact_match: float
    edit_distance: float
    similarity: float
    citacoes_invalidas: int
    citacoes_total: int
    citacoes: list[dict] = field(default_factory=list)


def score_case(pair: CasePair) -> CaseScores:
    em = 1.0 if exact_match(pair.referencia, pair.gerado) else 0.0
    dist = float(levenshtein(pair.referencia, pair.gerado))
    sim = normalized_similarity(pair.referencia, pair.gerado)

    canonical = pair.citacoes_canonicas or extract_citations(pair.referencia)
    cit_results = check_citations(pair.gerado, canonical)
    invalidas = sum(1 for c in cit_results if c.status != "existe")

    return CaseScores(
        golden_case_id=pair.golden_case_id,
        exact_match=em,
        edit_distance=dist,
        similarity=sim,
        citacoes_invalidas=invalidas,
        citacoes_total=len(cit_results),
        citacoes=[c.as_dict() for c in cit_results],
    )


def aggregate(scores: list[CaseScores]) -> dict[str, float]:
    """Agrega os scores por execução nas métricas usadas pelo gate/dashboard."""
    if not scores:
        return {}
    n = len(scores)
    total_cit = sum(s.citacoes_total for s in scores)
    invalid_cit = sum(s.citacoes_invalidas for s in scores)
    return {
        "exact_match": sum(s.exact_match for s in scores) / n,
        "similarity": sum(s.similarity for s in scores) / n,
        "edit_distance": sum(s.edit_distance for s in scores) / n,
        "taxa_citacao_invalida": (invalid_cit / total_cit) if total_cit else 0.0,
    }
