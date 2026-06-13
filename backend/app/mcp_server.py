"""Servidor MCP (Model Context Protocol) — expõe a plataforma goldendata a
agentes de IA (Claude e outros) via Streamable HTTP.

SDK oficial (mcp>=1.27). Stateless + JSON para rodar atrás do proxy do Railway.
Cada tool abre sua própria transação via core.db.connection(), reaproveitando a
trilha de auditoria encadeada por hash — o ator das operações é "mcp".

A proteção por token (Bearer) é feita pelo MCPAuthMiddleware em app.main, a
partir de GOLDENDATA_MCP_TOKEN. Sem token configurado o MCP fica aberto (demo).
"""
from __future__ import annotations

from typing import Any

from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

from app.core.config import settings
from app.core.db import connection, fetch_all
from app.domain.evaluation import schemas as eval_schemas
from app.domain.evaluation import service as eval_svc
from app.domain.registry import schemas as reg_schemas
from app.domain.registry import service as reg_svc

# Proteção anti DNS-rebinding do SDK: atrás do proxy do Railway, o header Host é
# o domínio público — precisa estar na allowlist. Em dev (lista vazia) a proteção
# é desligada, pois o acesso já é protegido por token Bearer + TLS.
_allowed_hosts = settings.mcp_allowed_hosts_list
if _allowed_hosts:
    _transport_security = TransportSecuritySettings(
        allowed_hosts=_allowed_hosts + [f"{h}:*" for h in _allowed_hosts],
        allowed_origins=["*"],
    )
else:
    _transport_security = TransportSecuritySettings(enable_dns_rebinding_protection=False)

mcp = FastMCP(
    "goldendata",
    stateless_http=True,   # sem estado de sessão entre chamadas (réplicas/proxy)
    json_response=True,    # respostas JSON simples em vez de stream SSE
    transport_security=_transport_security,
)

# Ator fixo da auditoria para operações via MCP (a trigger audit_capture lê isto).
_ACTOR = "mcp"


# --------------------------------------------------------------------------- #
# Leitura (3.2 Registro + 3.3 Avaliação + Governança)                          #
# --------------------------------------------------------------------------- #
@mcp.tool()
def listar_ferramentas() -> list[dict[str, Any]]:
    """Lista todas as ferramentas/agentes de IA registrados no catálogo institucional (3.2).

    Retorna, para cada solução: código institucional, nome, tipo, unidade
    responsável, categoria de risco (alto/baixo e a categoria CNJ 615 granular),
    estágio do ciclo de vida e demais campos do dossiê de governança.
    """
    with connection(actor_sub=_ACTOR) as conn:
        return reg_svc.list_tools(conn)


@mcp.tool()
def obter_ficha_tecnica(tool_id: str) -> dict[str, Any] | None:
    """Retorna a ficha técnica consolidada de uma ferramenta (CNJ 615/2025).

    Inclui ferramenta, especificação de agente, inventário de dados (LGPD/ROPA),
    versões de prompt, versões da ferramenta, riscos e anexos.

    Args:
        tool_id: UUID da ferramenta (campo "id" de listar_ferramentas).
    """
    with connection(actor_sub=_ACTOR) as conn:
        return reg_svc.get_ficha_tecnica(conn, tool_id)


@mcp.tool()
def listar_modelos_base() -> list[dict[str, Any]]:
    """Lista os modelos-base cadastrados (provedor, nome, versão, hospedagem)."""
    with connection(actor_sub=_ACTOR) as conn:
        return reg_svc.list_model_bases(conn)


@mcp.tool()
def obter_indicadores_qualidade(tool_id: str) -> list[dict[str, Any]]:
    """Indicadores de qualidade (KPIs) acumulados de uma ferramenta (3.3).

    Inclui taxa de aceitação, taxa de correção e detecção de alucinação por
    versão avaliada.

    Args:
        tool_id: UUID da ferramenta.
    """
    with connection(actor_sub=_ACTOR) as conn:
        return eval_svc.list_kpi(conn, tool_id)


@mcp.tool()
def obter_metricas_avaliacao(run_id: str) -> dict[str, float]:
    """Métricas agregadas de uma execução de avaliação (store-only).

    Ex.: exact_match, edit_distance, similarity e checagem de citações
    (detecção determinística de alucinação).

    Args:
        run_id: UUID da execução de avaliação (eval_run).
    """
    with connection(actor_sub=_ACTOR) as conn:
        return eval_svc.compute_aggregate(conn, run_id)


@mcp.tool()
def verificar_auditoria(
    entidade: str | None = None,
    entidade_id: str | None = None,
    limite: int = 50,
) -> dict[str, Any]:
    """Consulta a trilha de auditoria e verifica a integridade da cadeia de hashes.

    A trilha é append-only e encadeada por SHA-256; "intacta": false indica
    adulteração ou remoção de registros.

    Args:
        entidade: filtra por tipo de entidade (ex.: "tool", "promotion_gate"). Opcional.
        entidade_id: filtra por UUID da entidade. Opcional.
        limite: número máximo de registros recentes a retornar (máx. 200).
    """
    with connection(actor_sub=_ACTOR) as conn:
        cadeia = fetch_all(conn, "SELECT id, prev_hash, hash FROM audit_log ORDER BY id")
        quebras: list[int] = []
        anterior = None
        for r in cadeia:
            if anterior is not None and r["prev_hash"] != anterior:
                quebras.append(r["id"])
            anterior = r["hash"]

        sql = "SELECT * FROM audit_log"
        params: list[Any] = []
        if entidade:
            sql += " WHERE entidade = %s"
            params.append(entidade)
            if entidade_id:
                sql += " AND entidade_id = %s"
                params.append(entidade_id)
        sql += " ORDER BY id DESC LIMIT %s"
        params.append(min(limite, 200))
        registros = fetch_all(conn, sql, tuple(params))

    return {
        "total_entradas": len(cadeia),
        "cadeia_intacta": not quebras,
        "quebras": quebras,
        "registros": registros,
    }


# --------------------------------------------------------------------------- #
# Escrita (operações entram na trilha de auditoria como ator "mcp")            #
# --------------------------------------------------------------------------- #
@mcp.tool()
def registrar_ferramenta(
    codigo_institucional: str,
    nome: str,
    unidade_responsavel: str,
    tipo: str = "ferramenta",
    descricao: str | None = None,
    categoria_risco: str | None = None,
    categoria_risco_cnj: str | None = None,
    justificativa_risco: str | None = None,
    processo_sei: str | None = None,
    estagio_gexia: str | None = None,
    status_governanca: str | None = None,
) -> dict[str, Any]:
    """Registra uma nova ferramenta/agente de IA no catálogo (3.2).

    Args:
        codigo_institucional: código único (ex.: "IA-2025-002" ou "DOS-21").
        nome: nome da solução.
        unidade_responsavel: unidade gestora/solicitante.
        tipo: "ferramenta" ou "agente".
        descricao: finalidade/descrição funcional.
        categoria_risco: "alto" ou "baixo" (classificação binária). Opcional.
        categoria_risco_cnj: categoria CNJ 615 granular (ex.: "BR1", "AR3"). Opcional.
        justificativa_risco: fundamentação da categorização. Opcional.
        processo_sei: número do processo SEI. Opcional.
        estagio_gexia: estágio do dossiê (ex.: "Em uso", "Em estudo"). Opcional.
        status_governanca: status da análise de governança. Opcional.
    """
    body = reg_schemas.ToolCreate(
        codigo_institucional=codigo_institucional,
        nome=nome,
        tipo=tipo,
        descricao=descricao,
        unidade_responsavel=unidade_responsavel,
        categoria_risco=categoria_risco,
        categoria_risco_cnj=categoria_risco_cnj,
        justificativa_risco=justificativa_risco,
        processo_sei=processo_sei,
        estagio_gexia=estagio_gexia,
        status_governanca=status_governanca,
        origem_registro="mcp",
    )
    with connection(actor_sub=_ACTOR) as conn:
        return reg_svc.create_tool(conn, body, owner_sub=_ACTOR)


@mcp.tool()
def criar_modelo_base(
    provedor: str,
    nome: str,
    versao: str,
    hospedagem: str = "api_externa",
    notas_conformidade: str | None = None,
) -> dict[str, Any]:
    """Cadastra um modelo-base de IA (provedor + versão) usado pelas ferramentas.

    Args:
        provedor: ex.: "OpenAI", "Anthropic", "Google", "modelo_interno".
        nome: ex.: "gpt-4o", "claude-opus-4".
        versao: snapshot/versão do modelo.
        hospedagem: "api_externa", "on_premise" ou "nuvem_homologada".
        notas_conformidade: observações de conformidade (CNJ 615 Art. 28). Opcional.
    """
    body = reg_schemas.ModelBaseCreate(
        provedor=provedor, nome=nome, versao=versao,
        hospedagem=hospedagem, notas_conformidade=notas_conformidade,
    )
    with connection(actor_sub=_ACTOR) as conn:
        return reg_svc.create_model_base(conn, body)


@mcp.tool()
def anotar_saida(
    eval_output_id: str,
    label: str,
    texto_corrigido: str | None = None,
    marcou_alucinacao: bool = False,
    justificativa: str | None = None,
) -> dict[str, Any]:
    """Registra uma anotação humana sobre uma saída avaliada (human-in-the-loop, 3.3).

    Args:
        eval_output_id: UUID da saída avaliada.
        label: "aceite", "correcao" ou "rejeicao".
        texto_corrigido: versão corrigida (mede o esforço de correção). Opcional.
        marcou_alucinacao: True se a saída contém alucinação.
        justificativa: comentário do avaliador. Opcional.
    """
    body = eval_schemas.AnnotationCreate(
        eval_output_id=eval_output_id, label=label, texto_corrigido=texto_corrigido,
        marcou_alucinacao=marcou_alucinacao, justificativa=justificativa,
    )
    with connection(actor_sub=_ACTOR) as conn:
        return eval_svc.create_annotation(conn, body, annotator_sub=_ACTOR)


@mcp.tool()
def decidir_gate(gate_id: str, aprovar: bool, justificativa: str) -> dict[str, Any]:
    """Decide o gate de promoção de uma versão para produção (3.3).

    O gate é fail-closed: uma versão abaixo dos thresholds de qualidade é
    bloqueada. A decisão fica registrada na trilha de auditoria.

    Args:
        gate_id: UUID do gate de promoção.
        aprovar: True para aprovar a promoção, False para reprovar.
        justificativa: fundamentação obrigatória da decisão.
    """
    body = eval_schemas.GateDecide(aprovar=aprovar, justificativa=justificativa)
    with connection(actor_sub=_ACTOR) as conn:
        return eval_svc.decide_gate(conn, gate_id, body, aprovador_sub=_ACTOR)
