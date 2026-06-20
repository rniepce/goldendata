"""Serviço de incidentes (#1). Auditado pela trigger trg_audit_incident_report (0005)."""
from __future__ import annotations

from typing import Any

from app.core.db import execute, fetch_all, fetch_one

from . import schemas


def list_incidentes(conn: Any, tool_id: str | None = None) -> list[dict]:
    sql = (
        "SELECT ir.*, t.nome AS tool_nome, t.codigo_institucional AS tool_codigo "
        "FROM incident_report ir JOIN tool t ON t.id = ir.tool_id"
    )
    params: list[Any] = []
    if tool_id:
        sql += " WHERE ir.tool_id = %s"
        params.append(tool_id)
    sql += " ORDER BY ir.identificado_em DESC LIMIT 500"
    return fetch_all(conn, sql, tuple(params))


def create_incidente(conn: Any, body: schemas.IncidenteCreate, reportado_por_sub: str) -> dict:
    return execute(
        conn,
        """INSERT INTO incident_report (tool_id, descricao_evento, causa, medida_correcao,
              identificado_em, comunicado_em, prazo_72h_cumprido, reportado_por_sub)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (
            body.tool_id, body.descricao_evento, body.causa, body.medida_correcao,
            body.identificado_em, body.comunicado_em, body.prazo_72h_cumprido, reportado_por_sub,
        ),
    )


def update_incidente(conn: Any, inc_id: str, body: schemas.IncidenteUpdate) -> dict | None:
    campos = body.model_dump(exclude_unset=True)
    if not campos:
        return fetch_one(conn, "SELECT * FROM incident_report WHERE id = %s", (inc_id,))
    sets = ", ".join(f"{k} = %s" for k in campos)
    params = list(campos.values()) + [inc_id]
    return execute(
        conn,
        f"UPDATE incident_report SET {sets} WHERE id = %s RETURNING *",  # noqa: S608 (chaves do schema)
        tuple(params),
    )
