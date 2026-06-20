"""Serviço da base de conhecimento. Queries parametrizadas (CESEC).

A escrita de `documento` é auditada pela trigger `trg_audit_documento` (0011).
A cada criação/alteração de conteúdo, os `documento_chunk` são regenerados
(reindexação) para manter o índice de retrieval coerente.
"""
from __future__ import annotations

from typing import Any

from app.core.db import execute, fetch_all, fetch_one
from app.core.rag import chunk_text

from . import schemas

_LIST_COLS = (
    "d.id, d.titulo, d.tipo, d.fonte, d.tags, d.ativo, d.criado_por_sub, "
    "d.criado_em, d.atualizado_em, "
    "(SELECT count(*) FROM documento_chunk c WHERE c.documento_id = d.id) AS n_chunks"
)


def list_documentos(conn: Any, tipo: str | None = None, q: str | None = None) -> list[dict]:
    sql = f"SELECT {_LIST_COLS} FROM documento d"
    where: list[str] = []
    params: list[Any] = []
    if tipo:
        where.append("d.tipo::text = %s")
        params.append(tipo)
    if q and q.strip():
        where.append("(d.titulo ILIKE %s OR d.conteudo ILIKE %s)")
        like = f"%{q.strip()}%"
        params.extend([like, like])
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY d.atualizado_em DESC LIMIT 500"
    return fetch_all(conn, sql, tuple(params))


def get_documento(conn: Any, documento_id: str) -> dict | None:
    return fetch_one(
        conn,
        "SELECT d.*, (SELECT count(*) FROM documento_chunk c "
        "WHERE c.documento_id = d.id) AS n_chunks "
        "FROM documento d WHERE d.id = %s",
        (documento_id,),
    )


def reindex(conn: Any, documento_id: str) -> int:
    """Regenera os chunks de um documento. Retorna o nº de chunks gravados."""
    doc = fetch_one(conn, "SELECT conteudo FROM documento WHERE id = %s", (documento_id,))
    if doc is None:
        return 0
    chunks = chunk_text(doc["conteudo"])
    with conn.cursor() as cur:
        cur.execute("DELETE FROM documento_chunk WHERE documento_id = %s", (documento_id,))
        if chunks:
            cur.executemany(
                "INSERT INTO documento_chunk (documento_id, ordem, texto) VALUES (%s,%s,%s)",
                [(documento_id, i, texto) for i, texto in enumerate(chunks)],
            )
    return len(chunks)


def create_documento(conn: Any, body: schemas.DocumentoCreate, criado_por_sub: str) -> dict:
    row = execute(
        conn,
        """INSERT INTO documento (titulo, tipo, conteudo, fonte, tags, ativo, criado_por_sub)
           VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
        (body.titulo, body.tipo, body.conteudo, body.fonte, body.tags, body.ativo, criado_por_sub),
    )
    reindex(conn, row["id"])
    return get_documento(conn, row["id"])  # type: ignore[return-value]


def update_documento(conn: Any, documento_id: str, body: schemas.DocumentoUpdate) -> dict | None:
    campos = body.model_dump(exclude_unset=True)
    if not campos:
        return get_documento(conn, documento_id)
    sets = ", ".join(f"{k} = %s" for k in campos)
    params = list(campos.values()) + [documento_id]
    row = execute(
        conn,
        f"UPDATE documento SET {sets} WHERE id = %s RETURNING id",  # noqa: S608 (chaves do schema)
        tuple(params),
    )
    if row is None:
        return None
    if "conteudo" in campos:
        reindex(conn, documento_id)
    return get_documento(conn, documento_id)


def delete_documento(conn: Any, documento_id: str) -> bool:
    # ON DELETE CASCADE remove os chunks; a trigger audita a remoção do documento.
    row = execute(conn, "DELETE FROM documento WHERE id = %s RETURNING id", (documento_id,))
    return row is not None
