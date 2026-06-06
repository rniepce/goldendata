"""Similaridade e correspondência exata derivadas da distância de edição."""
from __future__ import annotations

import re

from .edit_distance import levenshtein

_WS_RE = re.compile(r"\s+")


def _normalize(text: str) -> str:
    return _WS_RE.sub(" ", text.strip().lower())


def normalized_similarity(a: str, b: str) -> float:
    """Similaridade em [0, 1] = 1 - dist / max(len). 1.0 = idênticos.

    A normalização (espaços/caixa) evita penalizar diferenças irrelevantes; é a
    base do cálculo de "quão próxima" a minuta gerada está da referência/publicada.
    """
    na, nb = _normalize(a), _normalize(b)
    if not na and not nb:
        return 1.0
    dist = levenshtein(na, nb)
    return 1.0 - dist / max(len(na), len(nb))


def exact_match(a: str, b: str) -> bool:
    """Igualdade após normalização de espaços e caixa."""
    return _normalize(a) == _normalize(b)
