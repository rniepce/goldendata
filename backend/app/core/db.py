"""Acesso ao Postgres via psycopg3 com pool. Queries SEMPRE parametrizadas (CESEC)."""
from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import settings

_pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=settings.database_url,
            min_size=settings.db_pool_min,
            max_size=settings.db_pool_max,
            kwargs={"row_factory": dict_row},
            open=True,
        )
    return _pool


@contextmanager
def connection(actor_sub: str | None = None, ip: str | None = None, user_agent: str | None = None) -> Iterator[Any]:
    """Conexão transacional que injeta o contexto de auditoria (quem/onde/como).

    A trigger ``audit_capture`` lê estas variáveis de sessão para preencher a
    trilha de auditoria. Os valores são passados como parâmetros via ``set_config``
    (nunca interpolados em SQL).
    """
    pool = get_pool()
    with pool.connection() as conn:  # transação por bloco; commit/rollback automático
        with conn.cursor() as cur:
            cur.execute(
                "SELECT set_config('goldendata.current_user_sub', %s, true),"
                "       set_config('goldendata.current_ip', %s, true),"
                "       set_config('goldendata.current_user_agent', %s, true)",
                (actor_sub or "", ip or "", user_agent or ""),
            )
        yield conn


def fetch_one(conn: Any, sql: str, params: tuple | dict | None = None) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(sql, params or ())
        return cur.fetchone()


def fetch_all(conn: Any, sql: str, params: tuple | dict | None = None) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(sql, params or ())
        return cur.fetchall()


def execute(conn: Any, sql: str, params: tuple | dict | None = None) -> dict | None:
    """Executa um comando e retorna a linha de RETURNING, se houver."""
    with conn.cursor() as cur:
        cur.execute(sql, params or ())
        if cur.description is not None:
            return cur.fetchone()
        return None
