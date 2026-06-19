"""Serviço das Iniciativas do GEX-IA. Queries parametrizadas (CESEC)."""
from __future__ import annotations

from typing import Any

from app.core.db import execute, fetch_all, fetch_one

from . import schemas

_COLS = (
    "titulo", "resumo", "categoria", "status", "prioridade",
    "responsavel_email", "responsavel_nome", "tool_id", "processo_sei", "prazo",
)


def list_iniciativas(
    conn: Any,
    categoria: str | None = None,
    status: str | None = None,
    responsavel: str | None = None,
) -> list[dict]:
    sql = "SELECT * FROM iniciativa"
    where: list[str] = []
    params: list[Any] = []
    if categoria:
        where.append("categoria = %s")
        params.append(categoria)
    if status:
        where.append("status = %s")
        params.append(status)
    if responsavel:
        where.append("responsavel_email = %s")
        params.append(responsavel)
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY atualizado_em DESC"
    return fetch_all(conn, sql, tuple(params))


def get_iniciativa(conn: Any, iniciativa_id: str) -> dict | None:
    return fetch_one(conn, "SELECT * FROM iniciativa WHERE id = %s", (iniciativa_id,))


def create_iniciativa(conn: Any, body: schemas.IniciativaCreate, criado_por_sub: str) -> dict:
    return execute(
        conn,
        """INSERT INTO iniciativa (titulo, resumo, categoria, status, prioridade,
              responsavel_email, responsavel_nome, tool_id, processo_sei, prazo, criado_por_sub)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (
            body.titulo, body.resumo, body.categoria, body.status, body.prioridade,
            body.responsavel_email, body.responsavel_nome, body.tool_id,
            body.processo_sei, body.prazo, criado_por_sub,
        ),
    )


def update_iniciativa(conn: Any, iniciativa_id: str, body: schemas.IniciativaUpdate) -> dict | None:
    campos = body.model_dump(exclude_unset=True)
    if not campos:
        return get_iniciativa(conn, iniciativa_id)
    sets = ", ".join(f"{k} = %s" for k in campos)
    params = list(campos.values()) + [iniciativa_id]
    return execute(
        conn,
        f"UPDATE iniciativa SET {sets} WHERE id = %s RETURNING *",  # noqa: S608 (chaves de _COLS validadas pelo schema)
        tuple(params),
    )


def delete_iniciativa(conn: Any, iniciativa_id: str) -> bool:
    row = execute(conn, "DELETE FROM iniciativa WHERE id = %s RETURNING id", (iniciativa_id,))
    return row is not None
