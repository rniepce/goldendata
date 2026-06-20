"""Serviço dos encaminhamentos (#42). Queries parametrizadas (CESEC)."""
from __future__ import annotations

from typing import Any

from app.core.db import execute, fetch_all, fetch_one

from . import schemas


def list_encaminhamentos(
    conn: Any, responsavel: str | None = None, status: str | None = None
) -> list[dict]:
    sql = "SELECT * FROM encaminhamento"
    where: list[str] = []
    params: list[Any] = []
    if responsavel:
        where.append("responsavel_email = %s")
        params.append(responsavel)
    if status:
        where.append("status = %s")
        params.append(status)
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY (prazo IS NULL), prazo, criado_em DESC LIMIT 500"
    return fetch_all(conn, sql, tuple(params))


def create_encaminhamento(conn: Any, body: schemas.EncaminhamentoCreate, criado_por_sub: str) -> dict:
    return execute(
        conn,
        """INSERT INTO encaminhamento (descricao, responsavel_email, responsavel_nome, prazo,
              origem, iniciativa_id, criado_por_sub)
           VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (
            body.descricao, body.responsavel_email, body.responsavel_nome, body.prazo,
            body.origem, body.iniciativa_id, criado_por_sub,
        ),
    )


def update_encaminhamento(conn: Any, enc_id: str, body: schemas.EncaminhamentoUpdate) -> dict | None:
    campos = body.model_dump(exclude_unset=True)
    if not campos:
        return fetch_one(conn, "SELECT * FROM encaminhamento WHERE id = %s", (enc_id,))
    sets = ", ".join(f"{k} = %s" for k in campos)
    params = list(campos.values()) + [enc_id]
    return execute(
        conn,
        f"UPDATE encaminhamento SET {sets} WHERE id = %s RETURNING *",  # noqa: S608 (chaves do schema)
        tuple(params),
    )
