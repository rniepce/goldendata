"""Mascaramento de dados pessoais (LGPD / CESEC §4.3)."""
from __future__ import annotations

import re

_CPF_RE = re.compile(r"(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})")


def mask_cpf(value: str) -> str:
    """Mascara CPF no formato Pix: ``***.777.888-**``.

    Mantém apenas os dígitos do meio (4º ao 9º), ocultando os 3 primeiros e os 2
    últimos — padrão adotado pelo TJMG/CESEC para exibição em consultas e relatórios.
    """
    if not value:
        return value

    def _repl(m: re.Match[str]) -> str:
        return f"***.{m.group(2)}.{m.group(3)}-**"

    return _CPF_RE.sub(_repl, value)


def mask_text_cpfs(text: str) -> str:
    """Mascara todos os CPFs encontrados em um bloco de texto livre."""
    return mask_cpf(text)
