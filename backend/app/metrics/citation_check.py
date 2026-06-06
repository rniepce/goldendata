"""Verificação determinística de citações jurídicas (detecção de alucinação).

Alucinação de citações (jurisprudência/legislação inexistente ou com número
incorreto) é um risco central em IA jurídica. No MVP a checagem é determinística:
1. extrai citações do texto gerado por padrões (súmulas, leis, artigos, processos);
2. confronta com uma BASE CANÔNICA fornecida (conjunto de citações válidas).

Na ausência de base canônica, as citações são extraídas e marcadas como
``existe`` apenas se constarem da referência (gabarito) — útil para o golden set.
A integração com a base oficial de jurisprudência/legislação entra na Fase V1.
"""
from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass

# Padrões comuns de citação em texto jurídico brasileiro.
_PATTERNS = [
    re.compile(r"S[úu]mula\s+(?:Vinculante\s+)?n?[ºo.]?\s*\d+", re.IGNORECASE),
    re.compile(r"Lei\s+n?[ºo.]?\s*[\d.]+/\d{2,4}", re.IGNORECASE),
    re.compile(r"art(?:igo)?\.?\s*\d+[ºo]?(?:[,\s-]+(?:inciso\s+)?[IVXLCDM]+)?", re.IGNORECASE),
    re.compile(r"(?:RE|REsp|AgRg|HC|ADI|ADC|ADPF|MS)\s*n?[ºo.]?\s*[\d.]+", re.IGNORECASE),
    re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}"),  # número CNJ de processo
]


@dataclass
class CitationResult:
    citacao: str
    status: str  # existe | inexistente | numero_incorreto | fora_contexto

    def as_dict(self) -> dict:
        return {"citacao": self.citacao, "status": self.status}


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower())


def extract_citations(text: str) -> list[str]:
    """Extrai citações jurídicas distintas, preservando a ordem de aparição."""
    found: list[str] = []
    seen: set[str] = set()
    for pat in _PATTERNS:
        for m in pat.finditer(text or ""):
            cit = m.group(0).strip()
            key = _norm(cit)
            if key not in seen:
                seen.add(key)
                found.append(cit)
    return found


def check_citations(generated: str, canonical: Iterable[str]) -> list[CitationResult]:
    """Confronta as citações do texto gerado contra a base canônica de citações válidas.

    ``canonical`` é o conjunto de citações reconhecidas como existentes (ex.: as
    presentes no gabarito do caso, ou — na Fase V1 — uma base oficial).
    """
    canon = {_norm(c) for c in canonical}
    results: list[CitationResult] = []
    for cit in extract_citations(generated):
        status = "existe" if _norm(cit) in canon else "inexistente"
        results.append(CitationResult(citacao=cit, status=status))
    return results
