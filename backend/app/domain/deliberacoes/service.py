"""Serviço das deliberações (#38). Queries parametrizadas (CESEC)."""
from __future__ import annotations

from typing import Any

from app.core.db import execute, fetch_all, fetch_one

from . import schemas


def list_deliberacoes(conn: Any, status: str | None = None) -> list[dict]:
    sql = (
        "SELECT d.*, (SELECT count(*) FROM voto v WHERE v.deliberacao_id = d.id) AS n_votos "
        "FROM deliberacao d"
    )
    params: list[Any] = []
    if status:
        sql += " WHERE d.status = %s"
        params.append(status)
    sql += " ORDER BY d.criado_em DESC LIMIT 500"
    return fetch_all(conn, sql, tuple(params))


def get_deliberacao(conn: Any, deliberacao_id: str) -> dict | None:
    d = fetch_one(conn, "SELECT * FROM deliberacao WHERE id = %s", (deliberacao_id,))
    if d is None:
        return None
    votos = fetch_all(
        conn, "SELECT * FROM voto WHERE deliberacao_id = %s ORDER BY criado_em", (deliberacao_id,)
    )
    apuracao = {"favoravel": 0, "contrario": 0, "abstencao": 0, "impedido": 0}
    for v in votos:
        apuracao[v["valor"]] = apuracao.get(v["valor"], 0) + 1
    return {"deliberacao": d, "votos": votos, "apuracao": apuracao}


def create_deliberacao(conn: Any, body: schemas.DeliberacaoCreate, criado_por_sub: str) -> dict:
    return execute(
        conn,
        """INSERT INTO deliberacao (titulo, pauta, relator_email, iniciativa_id, tool_id, criado_por_sub)
           VALUES (%s,%s,%s,%s,%s,%s) RETURNING *""",
        (body.titulo, body.pauta, body.relator_email, body.iniciativa_id, body.tool_id, criado_por_sub),
    )


def registrar_voto(conn: Any, deliberacao_id: str, body: schemas.VotoRegistrar) -> dict | None:
    if fetch_one(conn, "SELECT 1 FROM deliberacao WHERE id = %s", (deliberacao_id,)) is None:
        return None
    return execute(
        conn,
        """INSERT INTO voto (deliberacao_id, membro_email, membro_nome, valor)
           VALUES (%s,%s,%s,%s)
           ON CONFLICT (deliberacao_id, membro_email)
           DO UPDATE SET valor = EXCLUDED.valor, membro_nome = EXCLUDED.membro_nome
           RETURNING *""",
        (deliberacao_id, body.membro_email, body.membro_nome, body.valor),
    )


def encerrar(conn: Any, deliberacao_id: str, body: schemas.DeliberacaoEncerrar) -> dict | None:
    return execute(
        conn,
        "UPDATE deliberacao SET status='encerrada', resultado=%s WHERE id=%s RETURNING *",
        (body.resultado, deliberacao_id),
    )
