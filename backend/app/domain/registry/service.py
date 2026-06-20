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
                             explicacao_linguagem_simples, sinapses_id, proxima_revisao_em,
                             status_ciclo_vida,
                             categoria_risco_cnj, processo_sei, estagio_gexia, fase_gexia,
                             desenvolvimento, instituicao_parceira, interfaces_institucionais,
                             riscos_identificados, proximos_passos, status_governanca,
                             analista_responsavel, documento_origem, data_analise, observacoes,
                             origem_registro)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                   COALESCE(%s, 'rascunho')::lifecycle_stage,
                   %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (
            body.codigo_institucional, body.nome, body.tipo, body.descricao,
            body.unidade_responsavel, owner_sub, body.categoria_risco, body.justificativa_risco,
            Jsonb(body.vedacoes_checklist), body.grau_supervisao_humana,
            body.revisao_humana_obrigatoria, body.explicacao_linguagem_simples,
            body.sinapses_id, body.proxima_revisao_em,
            body.status_ciclo_vida,
            body.categoria_risco_cnj, body.processo_sei, body.estagio_gexia, body.fase_gexia,
            body.desenvolvimento, body.instituicao_parceira, body.interfaces_institucionais,
            Jsonb(body.riscos_identificados), body.proximos_passos, body.status_governanca,
            body.analista_responsavel, body.documento_origem, body.data_analise, body.observacoes,
            body.origem_registro,
        ),
    )


def list_tools(conn: Any) -> list[dict]:
    return fetch_all(conn, "SELECT * FROM tool ORDER BY criado_em DESC")


def get_tool(conn: Any, tool_id: str) -> dict | None:
    return fetch_one(conn, "SELECT * FROM tool WHERE id = %s", (tool_id,))


_TOOL_JSONB = {"vedacoes_checklist", "riscos_identificados"}


def update_tool(conn: Any, tool_id: str, body: schemas.ToolUpdate) -> dict | None:
    """Atualização parcial da ficha/dossiê. A trigger trg_audit_tool registra a
    mudança na trilha de auditoria."""
    campos = body.model_dump(exclude_unset=True)
    if not campos:
        return get_tool(conn, tool_id)
    sets, params = [], []
    for k, v in campos.items():
        sets.append(f"{k} = %s")
        params.append(Jsonb(v) if k in _TOOL_JSONB else v)
    sets.append("atualizado_em = now()")  # tool não tem touch trigger
    params.append(tool_id)
    return execute(
        conn,
        f"UPDATE tool SET {', '.join(sets)} WHERE id = %s RETURNING *",  # noqa: S608 (chaves do schema)
        tuple(params),
    )


def tool_saude(conn: Any, tool_id: str) -> dict | None:
    """Semáforo de saúde da ferramenta (#11): consolida conformidade, KPIs e gate.
    verde = em dia · âmbar = pendências · vermelho = pendências em produção/alucinação."""
    from datetime import date

    from app.domain.assistente import conformidade as conf

    ficha = get_ficha_tecnica(conn, tool_id)
    if ficha is None:
        return None
    gates = [
        r["resultado"]
        for r in fetch_all(
            conn,
            "SELECT pg.resultado::text AS resultado FROM promotion_gate pg "
            "JOIN tool_version tv ON tv.id = pg.tool_version_id WHERE tv.tool_id = %s",
            (tool_id,),
        )
    ]
    anexos_tipos = {a.get("tipo") for a in (ficha.get("attachments") or []) if a.get("tipo")}
    itens = conf.avaliar_conformidade(ficha, gates, anexos_tipos, date.today())
    pendentes = sum(1 for i in itens if i["status"] == conf.PENDENTE)
    kpi = fetch_one(
        conn,
        "SELECT taxa_aceitacao, taxa_alucinacao FROM kpi_quality "
        "WHERE tool_id = %s ORDER BY calculado_em DESC LIMIT 1",
        (tool_id,),
    )
    aluc = kpi.get("taxa_alucinacao") if kpi else None
    alucinacao_alta = aluc is not None and aluc > 0.1
    em_producao = (ficha["ferramenta"] or {}).get("status_ciclo_vida") == "em_producao"
    sem_gate = "aprovado" not in gates

    sinais: list[str] = []
    if alucinacao_alta:
        sinais.append(f"Taxa de alucinação em {round(aluc * 100)}%")
    if pendentes:
        sinais.append(f"{pendentes} pendência(s) de conformidade")
    if em_producao and sem_gate:
        sinais.append("Em produção sem gate aprovado")

    if alucinacao_alta or (em_producao and (pendentes or sem_gate)):
        nivel = "vermelho"
    elif pendentes:
        nivel = "ambar"
    else:
        nivel = "verde"

    return {
        "nivel": nivel,
        "pendencias_conformidade": pendentes,
        "taxa_aceitacao": kpi.get("taxa_aceitacao") if kpi else None,
        "taxa_alucinacao": aluc,
        "em_producao": em_producao,
        "sinais": sinais,
    }


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
