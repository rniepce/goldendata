"""Serviço do Registro (3.2). Todas as queries são parametrizadas (CESEC)."""
from __future__ import annotations

from typing import Any

from psycopg.types.json import Jsonb

from app.core.db import execute, fetch_all, fetch_one

from . import schemas


def create_model_base(conn: Any, body: schemas.ModelBaseCreate) -> dict:
    return execute(
        conn,
        """INSERT INTO model_base (provedor, nome, versao, hospedagem, notas_conformidade)
           VALUES (%s, %s, %s, %s, %s) RETURNING *""",
        (body.provedor, body.nome, body.versao, body.hospedagem, body.notas_conformidade),
    )


def list_model_bases(conn: Any) -> list[dict]:
    return fetch_all(conn, "SELECT * FROM model_base ORDER BY provedor, nome, versao")


def create_tool(conn: Any, body: schemas.ToolCreate, owner_sub: str) -> dict:
    return execute(
        conn,
        """INSERT INTO tool (codigo_institucional, nome, tipo, descricao, unidade_responsavel,
                             owner_sub, categoria_risco, justificativa_risco, vedacoes_checklist,
                             grau_supervisao_humana, revisao_humana_obrigatoria,
                             explicacao_linguagem_simples, sinapses_id, proxima_revisao_em)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (
            body.codigo_institucional, body.nome, body.tipo, body.descricao,
            body.unidade_responsavel, owner_sub, body.categoria_risco, body.justificativa_risco,
            Jsonb(body.vedacoes_checklist), body.grau_supervisao_humana,
            body.revisao_humana_obrigatoria, body.explicacao_linguagem_simples,
            body.sinapses_id, body.proxima_revisao_em,
        ),
    )


def list_tools(conn: Any) -> list[dict]:
    return fetch_all(conn, "SELECT * FROM tool ORDER BY criado_em DESC")


def get_tool(conn: Any, tool_id: str) -> dict | None:
    return fetch_one(conn, "SELECT * FROM tool WHERE id = %s", (tool_id,))


def get_ficha_tecnica(conn: Any, tool_id: str) -> dict | None:
    """Visão consolidada da ficha técnica: ferramenta + dados + versões + riscos + anexos.

    Contrato: a ferramenta vai aninhada em "ferramenta" (tipo ToolFicha do front).
    """
    tool = get_tool(conn, tool_id)
    if tool is None:
        return None
    return {
        "ferramenta": tool,
        "agent_spec": fetch_one(conn, "SELECT * FROM agent_spec WHERE tool_id = %s", (tool_id,)),
        "data_inventory": fetch_all(
            conn, "SELECT * FROM data_inventory WHERE tool_id = %s ORDER BY criado_em", (tool_id,)
        ),
        "prompt_versions": fetch_all(
            conn, "SELECT * FROM prompt_version WHERE tool_id = %s ORDER BY criado_em DESC", (tool_id,)
        ),
        "tool_versions": fetch_all(
            conn, "SELECT * FROM tool_version WHERE tool_id = %s ORDER BY criado_em DESC", (tool_id,)
        ),
        "risks": fetch_all(
            conn, "SELECT * FROM risk_register WHERE tool_id = %s ORDER BY criado_em DESC", (tool_id,)
        ),
        "attachments": fetch_all(
            conn, "SELECT * FROM attachment WHERE tool_id = %s ORDER BY criado_em DESC", (tool_id,)
        ),
    }


def create_prompt_version(conn: Any, tool_id: str, body: schemas.PromptVersionCreate, autor_sub: str) -> dict:
    return execute(
        conn,
        """INSERT INTO prompt_version (tool_id, versao, conteudo, parent_version, changelog, autor_sub)
           VALUES (%s,%s,%s,%s,%s,%s) RETURNING *""",
        (tool_id, body.versao, body.conteudo, body.parent_version, body.changelog, autor_sub),
    )


def create_tool_version(conn: Any, tool_id: str, body: schemas.ToolVersionCreate, criado_por_sub: str) -> dict:
    return execute(
        conn,
        """INSERT INTO tool_version (tool_id, versao, model_base_id, prompt_version_id, config,
                                     git_commit, changelog, criado_por_sub)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (
            tool_id, body.versao, body.model_base_id, body.prompt_version_id,
            Jsonb(body.config), body.git_commit, body.changelog, criado_por_sub,
        ),
    )


def add_data_inventory(conn: Any, tool_id: str, body: schemas.DataInventoryCreate) -> dict:
    return execute(
        conn,
        """INSERT INTO data_inventory (tool_id, natureza, origem, categorias_dados,
              contem_dados_pessoais, contem_dados_sensiveis, contem_dados_criancas, contem_sigilo,
              base_legal, tecnicas_protecao, retencao_criterio, descarte_programado_em,
              finalidade_exclusiva_jurisdicional, ripd_requerido)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (
            tool_id, body.natureza, body.origem, Jsonb(body.categorias_dados),
            body.contem_dados_pessoais, body.contem_dados_sensiveis, body.contem_dados_criancas,
            body.contem_sigilo, body.base_legal, Jsonb(body.tecnicas_protecao),
            body.retencao_criterio, body.descarte_programado_em,
            body.finalidade_exclusiva_jurisdicional, body.ripd_requerido,
        ),
    )
