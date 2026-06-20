"""Serviço do balcão de demandas (#37). Queries parametrizadas (CESEC).

Triagem: aceitar cria uma iniciativa vinculada; recusar/devolver registram motivo.
Tudo auditado pela trigger trg_audit_demanda (0013).
"""
from __future__ import annotations

from typing import Any

from app.core.db import execute, fetch_all, fetch_one

from . import schemas

_CATEGORIAS = {
    "solucao_ia",
    "educacional",
    "suporte",
    "governanca_normativo",
    "cooperacao",
    "pesquisa_prospeccao",
}


def list_demandas(conn: Any, status: str | None = None) -> list[dict]:
    sql = "SELECT * FROM demanda"
    params: list[Any] = []
    if status:
        sql += " WHERE status = %s"
        params.append(status)
    sql += " ORDER BY criado_em DESC LIMIT 500"
    return fetch_all(conn, sql, tuple(params))


def create_demanda(conn: Any, body: schemas.DemandaCreate, criado_por_sub: str) -> dict:
    return execute(
        conn,
        """INSERT INTO demanda (unidade_demandante, titulo, problema, processo_sei,
              classificacao_risco_preliminar, criado_por_sub)
           VALUES (%s,%s,%s,%s,%s,%s) RETURNING *""",
        (
            body.unidade_demandante, body.titulo, body.problema, body.processo_sei,
            body.classificacao_risco_preliminar, criado_por_sub,
        ),
    )


def triar(conn: Any, demanda_id: str, body: schemas.DemandaTriagem, ator_sub: str) -> dict | None:
    d = fetch_one(conn, "SELECT * FROM demanda WHERE id = %s", (demanda_id,))
    if d is None:
        return None
    if body.acao == "aceitar":
        categoria = body.categoria if body.categoria in _CATEGORIAS else "suporte"
        ini = execute(
            conn,
            """INSERT INTO iniciativa (titulo, resumo, categoria, status, processo_sei, criado_por_sub)
               VALUES (%s,%s,%s,'a_fazer',%s,%s) RETURNING id""",
            (d["titulo"], d.get("problema"), categoria, d.get("processo_sei"), ator_sub),
        )
        return execute(
            conn,
            "UPDATE demanda SET status='aceita', iniciativa_id=%s WHERE id=%s RETURNING *",
            (ini["id"], demanda_id),
        )
    novo_status = "recusada" if body.acao == "recusar" else "devolvida"
    return execute(
        conn,
        "UPDATE demanda SET status=%s, motivo=%s WHERE id=%s RETURNING *",
        (novo_status, body.motivo, demanda_id),
    )
