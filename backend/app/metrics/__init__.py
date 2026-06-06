"""Avaliadores store-only: a plataforma calcula métricas sobre saídas IMPORTADAS,
sem chamar modelos de IA. Determinísticos e estatísticos no MVP; NLI/LLM-judge
ficam para fases posteriores (on-prem, opcionais)."""
from .citation_check import CitationResult, check_citations, extract_citations
from .edit_distance import levenshtein
from .similarity import exact_match, normalized_similarity

__all__ = [
    "levenshtein",
    "normalized_similarity",
    "exact_match",
    "extract_citations",
    "check_citations",
    "CitationResult",
]
