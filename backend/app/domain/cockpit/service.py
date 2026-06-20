"""Cockpit de pendências do comitê (#13): agrega o que pede ação humana hoje.

Reúsa as tabelas existentes (gates, revisões, RIPD, incidentes, comentários,
iniciativas) — sem novo schema. Queries parametrizadas (CESEC).
"""
from __future__ import annotations

from typing import Any

from app.core.db import fetch_all


def get_cockpit(conn: Any) -> dict:
    # Gates que passaram automaticamente mas aguardam homologação humana.
    gates = fetch_all(
        conn,
        """SELECT pg.id AS gate_id, t.nome AS tool_nome, tv.versao, pg.criado_em
           FROM promotion_gate pg
           JOIN tool_version tv ON tv.id = pg.tool_version_id
           JOIN tool t ON t.id = tv.tool_id
           WHERE pg.aprovador_sub IS NULL
           ORDER BY pg.criado_em DESC LIMIT 50""",
    )

    # Revisões periódicas vencidas ou a vencer em 30 dias (#2).
    revisoes = fetch_all(
        conn,
        """SELECT id AS tool_id, codigo_institucional AS codigo, nome, proxima_revisao_em,
                  (proxima_revisao_em < current_date) AS vencida
           FROM tool
           WHERE proxima_revisao_em IS NOT NULL
             AND proxima_revisao_em <= current_date + INTERVAL '30 days'
           ORDER BY proxima_revisao_em LIMIT 50""",
    )

    # RIPD/AIA requerido pelo inventário e sem anexo correspondente (Art. 14).
    ripd = fetch_all(
        conn,
        """SELECT DISTINCT t.id AS tool_id, t.codigo_institucional AS codigo, t.nome
           FROM tool t
           JOIN data_inventory di ON di.tool_id = t.id AND di.ripd_requerido
           WHERE NOT EXISTS (
               SELECT 1 FROM attachment a
               WHERE a.tool_id = t.id AND a.tipo IN ('ripd','aia')
           )
           ORDER BY t.nome LIMIT 50""",
    )

    # Incidentes que ainda não confirmaram o cumprimento do prazo de 72h.
    incidentes = fetch_all(
        conn,
        """SELECT ir.id, t.nome AS tool_nome, ir.identificado_em, ir.prazo_72h_cumprido
           FROM incident_report ir
           JOIN tool t ON t.id = ir.tool_id
           WHERE ir.prazo_72h_cumprido IS NOT TRUE
           ORDER BY ir.identificado_em DESC NULLS LAST LIMIT 50""",
    )

    # Comentários de iniciativas ainda não resolvidos.
    comentarios = fetch_all(
        conn,
        """SELECT c.iniciativa_id, i.titulo AS iniciativa_titulo, c.texto, c.criado_em
           FROM comentario c
           JOIN iniciativa i ON i.id = c.iniciativa_id
           WHERE NOT c.resolvido
           ORDER BY c.criado_em DESC LIMIT 50""",
    )

    # Iniciativas com prazo vencido ainda em aberto.
    iniciativas = fetch_all(
        conn,
        """SELECT id, titulo, prazo, responsavel_nome
           FROM iniciativa
           WHERE prazo IS NOT NULL AND prazo < current_date
             AND status NOT IN ('concluido','cancelado')
           ORDER BY prazo LIMIT 50""",
    )

    return {
        "gates_aguardando": gates,
        "revisoes": revisoes,
        "ripd_pendente": ripd,
        "incidentes_abertos": incidentes,
        "comentarios_abertos": comentarios,
        "iniciativas_atrasadas": iniciativas,
        "contadores": {
            "gates": len(gates),
            "revisoes": len(revisoes),
            "ripd": len(ripd),
            "incidentes": len(incidentes),
            "comentarios": len(comentarios),
            "iniciativas": len(iniciativas),
        },
    }
