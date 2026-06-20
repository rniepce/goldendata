"""Detector determinístico de PII vazada nas saídas geradas (#48 — LGPD).

Marca PII presente na saída GERADA que NÃO está na referência/grounding — sinal
de vazamento (CPF, número de processo CNJ, OAB, e-mail). Lógica pura e testável.
"""
from __future__ import annotations

import re

_PADROES: list[tuple[str, re.Pattern[str]]] = [
    ("CPF", re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")),
    ("processo CNJ", re.compile(r"\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b")),
    ("OAB", re.compile(r"\bOAB[/\s-]*[A-Za-z]{2}\s*\d{3,6}\b")),
    ("e-mail", re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")),
]


def pii_vazada(gerado: str, referencia: str) -> list[str]:
    """Tipos de PII que aparecem no texto gerado e NÃO na referência."""
    ref = referencia or ""
    vazados: list[str] = []
    for nome, rx in _PADROES:
        for achado in rx.findall(gerado or ""):
            val = achado if isinstance(achado, str) else achado[0]
            if val and val not in ref:
                vazados.append(nome)
                break
    return vazados
