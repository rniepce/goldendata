"""Distância de edição de Levenshtein (Python puro, sem dependências).

Base da "taxa de correção das minutas": a distância entre a minuta gerada e a
versão revisada/publicada pelo servidor/magistrado é um sinal contínuo e barato
de quanto o humano precisou corrigir.
"""
from __future__ import annotations


def levenshtein(a: str, b: str) -> int:
    """Número mínimo de inserções/remoções/substituições para transformar ``a`` em ``b``."""
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)

    # Programação dinâmica com duas linhas (O(min(len)) de memória).
    if len(a) < len(b):
        a, b = b, a
    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        current = [i]
        for j, cb in enumerate(b, start=1):
            insert = current[j - 1] + 1
            delete = previous[j] + 1
            substitute = previous[j - 1] + (0 if ca == cb else 1)
            current.append(min(insert, delete, substitute))
        previous = current
    return previous[-1]
