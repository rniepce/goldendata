"""Checklist determinístico de conformidade CNJ 615 / LGPD por ferramenta (#24).

Lógica pura e testável: recebe a ficha consolidada + sinais (resultados de gate,
tipos de anexo) e devolve itens com status ok/pendente/na e a base normativa. A
IA, quando disponível, apenas NARRA o resultado — o veredito é determinístico.
"""
from __future__ import annotations

from datetime import date
from typing import Any

OK, PENDENTE, NA = "ok", "pendente", "na"


def _preenchido(v: Any) -> bool:
    return bool(v is not None and str(v).strip())


def avaliar_conformidade(
    ficha: dict[str, Any],
    gates_resultados: list[str],
    anexos_tipos: set[str],
    hoje: date,
) -> list[dict]:
    """Avalia a ficha contra os requisitos mínimos demonstráveis. Cada item:
    {requisito, status, detalhe, base}."""
    f = ficha.get("ferramenta") or {}
    inventario = ficha.get("data_inventory") or []
    versoes = ficha.get("tool_versions") or []
    itens: list[dict] = []

    def add(requisito: str, ok: bool, detalhe: str, base: str, na: bool = False) -> None:
        itens.append(
            {
                "requisito": requisito,
                "status": NA if na else (OK if ok else PENDENTE),
                "detalhe": detalhe,
                "base": base,
            }
        )

    risco = f.get("categoria_risco")
    add(
        "Classificação de risco definida",
        risco in ("alto", "baixo"),
        f"Classificada como risco {risco}." if risco else "Defina a categoria de risco (alto/baixo).",
        "CNJ 615 art. 9–11",
    )

    add(
        "Explicação em linguagem simples",
        _preenchido(f.get("explicacao_linguagem_simples")),
        "Preenchida."
        if _preenchido(f.get("explicacao_linguagem_simples"))
        else "Descreva, em linguagem acessível ao cidadão, o que a ferramenta faz.",
        "CNJ 615 art. 3/33",
    )

    add(
        "Supervisão humana descrita",
        _preenchido(f.get("grau_supervisao_humana")),
        str(f.get("grau_supervisao_humana") or "Informe o grau de supervisão humana."),
        "CNJ 615 art. 32",
    )

    add(
        "Inventário de dados (LGPD/ROPA)",
        len(inventario) >= 1,
        f"{len(inventario)} operação(ões) de tratamento registrada(s)."
        if inventario
        else "Cadastre ao menos uma operação de tratamento de dados.",
        "LGPD art. 37",
    )

    ripd_requerido = any(d.get("ripd_requerido") for d in inventario)
    if not ripd_requerido:
        add(
            "RIPD/AIA quando exigido",
            True,
            "Não requerido pelo inventário atual.",
            "CNJ 615 art. 14 / LGPD art. 38",
            na=True,
        )
    else:
        tem_anexo = bool({"ripd", "aia"} & anexos_tipos)
        add(
            "RIPD/AIA quando exigido",
            tem_anexo,
            "RIPD/AIA anexado."
            if tem_anexo
            else "O inventário marca RIPD requerido — anexe o RIPD/AIA aprovado.",
            "CNJ 615 art. 14 / LGPD art. 38",
        )

    add(
        "Versão registrada",
        len(versoes) >= 1,
        f"{len(versoes)} versão(ões) registrada(s)."
        if versoes
        else "Registre ao menos uma versão (modelo-base + prompt).",
        "CNJ 615 art. 13",
    )

    if "aprovado" in gates_resultados:
        add("Gate de promoção aprovado", True, "Há versão aprovada em gate.", "CNJ 615 art. 9 §1º")
    elif gates_resultados:
        add(
            "Gate de promoção aprovado",
            False,
            "Há gate registrado, mas nenhuma aprovação.",
            "CNJ 615 art. 9 §1º",
        )
    else:
        add(
            "Gate de promoção aprovado",
            False,
            "Nenhuma avaliação com gate registrada.",
            "CNJ 615 art. 9 §1º",
        )

    prox = f.get("proxima_revisao_em")
    if prox is None:
        add(
            "Revisão periódica agendada",
            False,
            "Defina a data da próxima revisão (≤ 12 meses).",
            "CNJ 615 art. 11 §2º",
        )
    elif isinstance(prox, date) and prox < hoje:
        add(
            "Revisão periódica agendada",
            False,
            f"Revisão vencida em {prox.isoformat()}.",
            "CNJ 615 art. 11 §2º",
        )
    else:
        quando = prox.isoformat() if isinstance(prox, date) else str(prox)
        add("Revisão periódica agendada", True, f"Próxima revisão em {quando}.", "CNJ 615 art. 11 §2º")

    return itens
