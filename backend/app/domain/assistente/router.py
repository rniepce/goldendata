"""Assistente: busca global (catálogo + iniciativas + datasets) e IA assistiva
(resumo executivo de ficha técnica e Q&A em linguagem natural sobre o acervo).

A busca é determinística (SQL ILIKE). A IA é opcional (chave no backend) e mantém
o humano no loop — sugere/resume, não decide.
"""
from __future__ import annotations

from datetime import date
from typing import Any, Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.core import doctext, ia, rag
from app.core.db import fetch_all, fetch_one
from app.core.deps import Ctx, get_ctx
from app.core.security_keycloak import require_role
from app.domain.cockpit import service as cockpit_svc
from app.domain.evaluation.gate import evaluate_gate
from app.domain.registry import service as registry_svc

from . import conformidade

router = APIRouter(tags=["assistente"])

_READ = require_role("owner_ferramenta", "coordenador_comite", "avaliador", "auditor_dpo", "admin")

# Aterramento da taxonomia de risco CNJ 615: evita que a IA leia "BR5" como nível
# alto. AR = Alto Risco, BR = Baixo Risco. A classificação registrada é soberana.
_CNJ_RISCO = (
    "IMPORTANTE — taxonomia de risco da Resolução CNJ 615/2025: os códigos começam "
    "com AR (Alto Risco) ou BR (Baixo Risco). Ex.: BR5 significa BAIXO risco; AR3 "
    "significa ALTO risco. O número é apenas um identificador do item, NÃO um nível. "
    "Use sempre a classificação de risco registrada e nunca reinterprete o código "
    "como um nível diferente do que está escrito."
)


# ---------------- Busca global ----------------
@router.get("/busca")
def busca(q: str, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    termo = (q or "").strip()
    if len(termo) < 2:
        return {"termo": termo, "resultados": []}
    like = f"%{termo}%"
    res: list[dict[str, Any]] = []
    for r in fetch_all(
        ctx.conn,
        """SELECT id, codigo_institucional, nome FROM tool
           WHERE nome ILIKE %s OR codigo_institucional ILIKE %s OR descricao ILIKE %s
                 OR categoria_risco_cnj ILIKE %s OR unidade_responsavel ILIKE %s
           ORDER BY nome LIMIT 20""",
        (like, like, like, like, like),
    ):
        res.append({"tipo": "Ferramenta", "id": r["id"], "titulo": r["nome"],
                    "subtitulo": r["codigo_institucional"], "link": f"/ferramentas/{r['id']}"})
    for r in fetch_all(
        ctx.conn,
        """SELECT id, titulo, resumo, responsavel_nome FROM iniciativa
           WHERE titulo ILIKE %s OR resumo ILIKE %s OR responsavel_nome ILIKE %s
           ORDER BY atualizado_em DESC LIMIT 20""",
        (like, like, like),
    ):
        res.append({"tipo": "Iniciativa", "id": r["id"], "titulo": r["titulo"],
                    "subtitulo": r.get("responsavel_nome") or (r.get("resumo") or "")[:70], "link": "/painel"})
    for r in fetch_all(
        ctx.conn,
        "SELECT id, nome FROM golden_dataset WHERE nome ILIKE %s ORDER BY nome LIMIT 10",
        (like,),
    ):
        res.append({"tipo": "Golden dataset", "id": r["id"], "titulo": r["nome"],
                    "subtitulo": "Conjunto de avaliação", "link": "/golden-datasets"})
    return {"termo": termo, "resultados": res}


# ---------------- IA: resumo de ficha técnica ----------------
@router.post("/ia/resumir-ferramenta/{tool_id}")
def resumir_ferramenta(tool_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    ficha = registry_svc.get_ficha_tecnica(ctx.conn, tool_id)
    if ficha is None:
        raise HTTPException(404, "Ferramenta não encontrada")
    f = ficha["ferramenta"]
    contexto = (
        f"Nome: {f.get('nome')}\nCódigo: {f.get('codigo_institucional')}\n"
        f"Unidade: {f.get('unidade_responsavel')}\n"
        f"Classificação de risco registrada: {f.get('categoria_risco') or 'não informada'} "
        f"(código CNJ 615: {f.get('categoria_risco_cnj') or '—'})\n"
        f"Estágio: {f.get('estagio_gexia')}\nDescrição: {f.get('descricao')}\n"
        f"Riscos: {f.get('riscos_identificados')}\nObservações: {f.get('observacoes')}\n"
        f"Versões: {len(ficha.get('tool_versions') or [])} · "
        f"Itens de inventário de dados: {len(ficha.get('data_inventory') or [])}"
    )
    system = (
        "Você é um analista de governança de IA do TJMG. Resuma a ficha técnica em um "
        "parecer executivo curto (4-6 linhas), em português formal, destacando finalidade, "
        "categoria de risco e pontos de atenção. Não invente dados ausentes. " + _CNJ_RISCO
    )
    try:
        resumo = ia.chamar(system, contexto, max_tokens=600)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(502, str(exc)) from exc
    return {"resumo": resumo}


# ---------------- IA: Q&A sobre o acervo ----------------
class Pergunta(BaseModel):
    pergunta: str = Field(min_length=3)


@router.post("/ia/perguntar")
def perguntar(body: Pergunta, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    # Limites de contexto: protege custo/limite de token da IA conforme o acervo cresce.
    tools = fetch_all(
        ctx.conn,
        """SELECT codigo_institucional, nome, unidade_responsavel, categoria_risco,
                  categoria_risco_cnj, estagio_gexia, descricao FROM tool
           ORDER BY codigo_institucional LIMIT 40""",
    )
    inics = fetch_all(
        ctx.conn,
        "SELECT titulo, categoria, status, responsavel_nome, prazo FROM iniciativa "
        "ORDER BY atualizado_em DESC LIMIT 30",
    )
    ctx_tools = "\n".join(
        f"- [{t['codigo_institucional']}] {t['nome']} · unidade {t['unidade_responsavel']} · "
        f"risco {t.get('categoria_risco') or '—'} (CNJ {t.get('categoria_risco_cnj') or '—'}) · "
        f"estágio {t.get('estagio_gexia')} · {(t.get('descricao') or '')[:160]}"
        for t in tools
    )
    ctx_inic = "\n".join(
        f"- {i['titulo']} · {i['categoria']} · {i['status']} · "
        f"resp {i.get('responsavel_nome')} · prazo {i.get('prazo')}"
        for i in inics
    )
    system = (
        "Você é o assistente do GEX-IA (governança de IA do TJMG). Responda à pergunta "
        "APENAS com base no contexto fornecido (catálogo de ferramentas e iniciativas). "
        "Se a resposta não estiver no contexto, diga que não há essa informação. Seja "
        "conciso, em português, e cite os itens relevantes pelo nome/código. " + _CNJ_RISCO
    )
    user = f"CONTEXTO — FERRAMENTAS:\n{ctx_tools}\n\nCONTEXTO — INICIATIVAS:\n{ctx_inic}\n\nPERGUNTA: {body.pergunta}"
    try:
        resposta = ia.chamar(system, user, max_tokens=900)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(502, str(exc)) from exc
    return {"resposta": resposta}


# ---------------- IA: copiloto-chat com RAG (#74) ----------------
def _acervo_contexto(conn: Any) -> tuple[str, str]:
    """Contexto compacto do acervo (ferramentas + iniciativas) para aterrar a IA."""
    tools = fetch_all(
        conn,
        """SELECT codigo_institucional, nome, unidade_responsavel, categoria_risco,
                  categoria_risco_cnj, estagio_gexia, descricao FROM tool
           ORDER BY codigo_institucional LIMIT 40""",
    )
    inics = fetch_all(
        conn,
        "SELECT titulo, categoria, status, responsavel_nome, prazo FROM iniciativa "
        "ORDER BY atualizado_em DESC LIMIT 30",
    )
    ctx_tools = "\n".join(
        f"- [{t['codigo_institucional']}] {t['nome']} · unidade {t['unidade_responsavel']} · "
        f"risco {t.get('categoria_risco') or '—'} (CNJ {t.get('categoria_risco_cnj') or '—'}) · "
        f"estágio {t.get('estagio_gexia')} · {(t.get('descricao') or '')[:160]}"
        for t in tools
    )
    ctx_inic = "\n".join(
        f"- {i['titulo']} · {i['categoria']} · {i['status']} · "
        f"resp {i.get('responsavel_nome')} · prazo {i.get('prazo')}"
        for i in inics
    )
    return ctx_tools, ctx_inic


class ChatTurno(BaseModel):
    papel: Literal["user", "assistant"]
    texto: str = Field(min_length=1, max_length=4000)


class ChatPergunta(BaseModel):
    pergunta: str = Field(min_length=2)
    historico: list[ChatTurno] = Field(default_factory=list)


@router.post("/ia/chat")
def chat(body: ChatPergunta, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    # RAG: trechos citáveis da base de conhecimento institucional + acervo aterrado.
    chunks = rag.retrieve(ctx.conn, body.pergunta, k=6)
    contexto_docs, fontes = rag.build_context(chunks)
    ctx_tools, ctx_inic = _acervo_contexto(ctx.conn)

    system = (
        "Você é o copiloto do GEX-IA (governança de IA do TJMG). Responda à pergunta com base "
        "no CONHECIMENTO INSTITUCIONAL (documentos numerados, citáveis por [n]) e no ACERVO "
        "(ferramentas e iniciativas). Cite as fontes do conhecimento pelo índice [n] quando as "
        "usar. Se a informação não estiver no contexto, diga claramente que não há essa "
        "informação na base. Seja conciso e objetivo, em português. " + _CNJ_RISCO
    )
    partes: list[str] = []
    if contexto_docs:
        partes.append(f"CONHECIMENTO INSTITUCIONAL (cite por [n]):\n{contexto_docs}")
    partes.append(f"ACERVO — FERRAMENTAS:\n{ctx_tools or '(vazio)'}")
    partes.append(f"ACERVO — INICIATIVAS:\n{ctx_inic or '(vazio)'}")
    if body.historico:
        # Teto de turnos para limitar custo/token; o histórico vem do cliente.
        recente = body.historico[-6:]
        transcript = "\n".join(
            f"{'Usuário' if t.papel == 'user' else 'Assistente'}: {t.texto}" for t in recente
        )
        partes.append(f"CONVERSA ANTERIOR:\n{transcript}")
    partes.append(f"PERGUNTA: {body.pergunta}")
    user = "\n\n".join(partes)

    try:
        resposta = ia.chamar(system, user, max_tokens=1000)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(502, str(exc)) from exc
    return {"resposta": resposta, "fontes": fontes}


# ---------------- IA: assistente de conformidade (#24) ----------------
@router.get("/ia/conformidade/{tool_id}")
def conformidade_ferramenta(tool_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    ficha = registry_svc.get_ficha_tecnica(ctx.conn, tool_id)
    if ficha is None:
        raise HTTPException(404, "Ferramenta não encontrada")
    gates = [
        r["resultado"]
        for r in fetch_all(
            ctx.conn,
            "SELECT pg.resultado::text AS resultado FROM promotion_gate pg "
            "JOIN tool_version tv ON tv.id = pg.tool_version_id WHERE tv.tool_id = %s",
            (tool_id,),
        )
    ]
    anexos_tipos = {a.get("tipo") for a in (ficha.get("attachments") or []) if a.get("tipo")}
    itens = conformidade.avaliar_conformidade(ficha, gates, anexos_tipos, date.today())
    pendentes = [i for i in itens if i["status"] == conformidade.PENDENTE]
    resultado: dict[str, Any] = {
        "tool_id": tool_id,
        "itens": itens,
        "total": len(itens),
        "ok": sum(1 for i in itens if i["status"] == conformidade.OK),
        "pendentes": len(pendentes),
        "na": sum(1 for i in itens if i["status"] == conformidade.NA),
    }
    # Narração opcional (best-effort): a IA só verbaliza o checklist determinístico.
    if ia.disponivel() and pendentes:
        f = ficha["ferramenta"]
        lista = "\n".join(f"- {i['requisito']}: {i['detalhe']} ({i['base']})" for i in pendentes)
        system = (
            "Você é analista de governança de IA do TJMG. Em 3-5 linhas, resuma de forma "
            "objetiva e acionável o que falta para a ferramenta ficar conforme. Não invente "
            "requisitos além dos listados. " + _CNJ_RISCO
        )
        user = f"Ferramenta: {f.get('nome')} ({f.get('codigo_institucional')}).\nPendências:\n{lista}"
        try:
            resultado["resumo_ia"] = ia.chamar(system, user, max_tokens=400)
        except (RuntimeError, ValueError):
            pass  # narração é opcional; o veredito é o checklist
    return resultado


# ---------------- IA: explicar a decisão do gate (#58) ----------------
@router.get("/ia/explicar-gate/{gate_id}")
def explicar_gate(gate_id: str, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    gate = fetch_one(ctx.conn, "SELECT * FROM promotion_gate WHERE id = %s", (gate_id,))
    if gate is None:
        raise HTTPException(404, "Gate não encontrado")
    exigidas = gate.get("metricas_exigidas") or {}
    obtidas = gate.get("metricas_obtidas") or {}
    bloqueios = gate.get("bloqueios") or []
    decision = evaluate_gate(exigidas, obtidas)
    checks_txt = (
        "\n".join(
            f"- {c.metrica}: exigido {c.threshold}, obtido {c.obtido} → "
            f"{'passou' if c.passou else 'reprovou'}"
            for c in decision.checks
        )
        or "(sem métricas exigidas)"
    )
    bloq_txt = "\n".join(f"- {b.get('detalhe')}" for b in bloqueios) or "(nenhum)"
    veredito = "aprovado" if (decision.aprovado and not bloqueios) else "reprovado"
    system = (
        "Você é analista de governança de IA do TJMG. Explique, em 3-5 linhas e linguagem "
        "objetiva, por que o gate de promoção desta versão ficou com este veredito: qual(is) "
        "métrica(s) ou bloqueio(s) de conformidade determinaram o resultado e o que aproximaria "
        "a versão da aprovação. Não invente critérios além dos listados. " + _CNJ_RISCO
    )
    user = (
        f"VEREDITO AUTOMÁTICO: {veredito}\n\nCHECKS DE MÉTRICAS:\n{checks_txt}\n\n"
        f"BLOQUEIOS DE CONFORMIDADE:\n{bloq_txt}"
    )
    try:
        explicacao = ia.chamar(system, user, max_tokens=500)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(502, str(exc)) from exc
    return {"gate_id": gate_id, "veredito": veredito, "explicacao": explicacao}


# ---------------- IA: ingestão de documento (SEI) — #76 e #77 ----------------
_EDIT_DOC = require_role("owner_ferramenta", "coordenador_comite", "admin")


def _entrada_documento(texto: str | None, file: UploadFile | None) -> str:
    """Texto do documento: do arquivo enviado (PDF/DOCX/TXT) ou do campo colado."""
    if file is not None and file.filename:
        try:
            conteudo = doctext.extrair_texto(file.filename, file.file.read())
        except RuntimeError as exc:
            raise HTTPException(415, str(exc)) from exc
        if conteudo.strip():
            return conteudo
    if texto and texto.strip():
        return texto.strip()
    raise HTTPException(400, "Forneça o texto do processo ou envie um arquivo legível.")


@router.post("/ia/redigir-resposta-sei")
def redigir_resposta_sei(
    texto: str | None = Form(None),
    file: UploadFile | None = File(None),
    ctx: Ctx = Depends(get_ctx),
    _=Depends(_EDIT_DOC),
):
    conteudo = _entrada_documento(texto, file)
    # RAG nas diretrizes/normas/modelos internos (a base de conhecimento).
    chunks = rag.retrieve(
        ctx.conn, conteudo[:2000], k=8, tipos=["diretriz", "norma", "modelo_resposta"]
    )
    contexto_docs, fontes = rag.build_context(chunks)
    system = (
        "Você é assessor do GEX-IA (TJMG). Redija uma MINUTA de resposta ao documento/processo "
        "informado, fundamentada SOMENTE nas diretrizes internas fornecidas, citando-as por [n] "
        "onde embasarem. Linguagem formal institucional. NÃO invente normas; se faltar base, "
        "marque [a confirmar]. A revisão humana do resultado é obrigatória. " + _CNJ_RISCO
    )
    user = (
        f"DIRETRIZES INTERNAS (cite por [n]):\n{contexto_docs or '(nenhuma diretriz indexada)'}\n\n"
        f"DOCUMENTO/PROCESSO:\n{conteudo[:6000]}\n\nProduza a minuta de resposta."
    )
    try:
        minuta = ia.chamar(system, user, max_tokens=1400)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(502, str(exc)) from exc
    return {"minuta": minuta, "fontes": fontes}


@router.post("/ia/extrair-card")
def extrair_card(
    texto: str | None = Form(None),
    file: UploadFile | None = File(None),
    ctx: Ctx = Depends(get_ctx),
    _=Depends(_EDIT_DOC),
):
    conteudo = _entrada_documento(texto, file)
    system = (
        "Você extrai metadados para abrir uma iniciativa de governança de IA do GEX-IA. A partir "
        "do documento, responda APENAS um objeto JSON com as chaves: titulo (curto), resumo (2-3 "
        "linhas), categoria (uma de: solucao_ia, educacional, suporte, governanca_normativo, "
        "cooperacao, pesquisa_prospeccao), risco_sugerido (alto|baixo|indefinido) e processo_sei "
        "(se houver). Não invente o que não estiver no documento. " + _CNJ_RISCO
    )
    try:
        bruto = ia.chamar(system, f"DOCUMENTO:\n{conteudo[:6000]}", max_tokens=500)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(502, str(exc)) from exc
    sugestao = doctext.parse_primeiro_json(bruto)
    return {"sugestao": sugestao, "bruto": None if sugestao else bruto}


# ---------------- IA: plano pessoal do membro (#75) ----------------
@router.get("/ia/plano-pessoal")
def plano_pessoal(ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    hoje = date.today()
    inics = fetch_all(
        ctx.conn,
        "SELECT id, titulo, status, prioridade, prazo FROM iniciativa "
        "WHERE responsavel_email = %s AND status NOT IN ('concluido','cancelado') "
        "ORDER BY (prazo IS NULL), prazo LIMIT 50",
        (ctx.user.email,),
    )
    revisoes = fetch_all(
        ctx.conn,
        "SELECT id, codigo_institucional, nome, proxima_revisao_em FROM tool "
        "WHERE owner_sub = %s AND proxima_revisao_em IS NOT NULL "
        "AND proxima_revisao_em <= (current_date + INTERVAL '30 days') "
        "ORDER BY proxima_revisao_em LIMIT 50",
        (ctx.user.sub,),
    )
    itens: list[dict[str, Any]] = []
    for i in inics:
        prazo = i.get("prazo")
        atrasada = prazo is not None and prazo < hoje
        itens.append(
            {
                "tipo": "iniciativa",
                "titulo": i["titulo"],
                "link": "/painel",
                "prazo": prazo.isoformat() if prazo else None,
                "urgencia": "atrasada" if atrasada else ("prazo" if prazo else "normal"),
            }
        )
    for t in revisoes:
        venc = t["proxima_revisao_em"]
        itens.append(
            {
                "tipo": "revisao",
                "titulo": f"Revisar {t['nome']} ({t['codigo_institucional']})",
                "link": f"/ferramentas/{t['id']}",
                "prazo": venc.isoformat(),
                "urgencia": "atrasada" if venc < hoje else "prazo",
            }
        )
    resultado: dict[str, Any] = {"membro": ctx.user.nome, "itens": itens}
    if ia.disponivel() and itens:
        lista = "\n".join(
            f"- [{x['tipo']}] {x['titulo']} (prazo {x['prazo'] or '—'}, {x['urgencia']})"
            for x in itens
        )
        system = (
            "Você é assistente de produtividade do GEX-IA. Organize as pendências do membro em "
            "'Hoje' (urgentes/atrasadas) e 'Esta semana', em tópicos curtos e acionáveis, em "
            "português. Não invente itens além dos listados. " + _CNJ_RISCO
        )
        try:
            resultado["resumo_ia"] = ia.chamar(system, f"Pendências:\n{lista}", max_tokens=500)
        except (RuntimeError, ValueError):
            pass
    return resultado


# ---------------- IA: sugestão de risco AR/BR (#26) ----------------
class SugerirRisco(BaseModel):
    texto: str = Field(min_length=10)


@router.post("/ia/sugerir-risco")
def sugerir_risco(body: SugerirRisco, ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    system = (
        "Você é analista de governança de IA do TJMG. A partir da descrição de uma solução, "
        "sugira a categoria de risco da Resolução CNJ 615/2025: 'alto' ou 'baixo'. Alto risco "
        "tipicamente envolve apoio a decisão judicial, dados sensíveis/sigilosos ou impacto "
        "direto em direitos das partes. Responda APENAS um JSON com as chaves: categoria "
        "(alto|baixo|indefinido) e justificativa (1-2 frases). A classificação final é humana. "
        + _CNJ_RISCO
    )
    try:
        bruto = ia.chamar(system, f"DESCRIÇÃO:\n{body.texto[:4000]}", max_tokens=400)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(502, str(exc)) from exc
    dados = doctext.parse_primeiro_json(bruto)
    return {
        "categoria": dados.get("categoria"),
        "justificativa": dados.get("justificativa"),
        "bruto": None if dados else bruto,
    }


# ---------------- IA: briefing/pauta prospectiva de reunião (#60) ----------------
@router.get("/ia/briefing-reuniao")
def briefing_reuniao(ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    dados = cockpit_svc.get_cockpit(ctx.conn)
    c = dados["contadores"]
    linhas = [f"Gates aguardando homologação: {c['gates']}"]
    linhas += [f"  - gate de {g['tool_nome']} (versão {g['versao']})" for g in dados["gates_aguardando"][:10]]
    linhas.append(f"Revisões vencidas/a vencer (≤30d): {c['revisoes']}")
    linhas += [
        f"  - {r['nome']} ({'VENCIDA' if r['vencida'] else r['proxima_revisao_em']})"
        for r in dados["revisoes"][:10]
    ]
    linhas.append(
        f"RIPD/AIA pendente: {c['ripd']} · Incidentes em aberto: {c['incidentes']} · "
        f"Comentários não resolvidos: {c['comentarios']} · Iniciativas atrasadas: {c['iniciativas']}"
    )
    linhas += [
        f"  - iniciativa atrasada: {i['titulo']} (prazo {i['prazo']})"
        for i in dados["iniciativas_atrasadas"][:10]
    ]
    estado = "\n".join(linhas)
    system = (
        "Você é chefe de gabinete do GEX-IA (TJMG). A partir do estado atual, monte uma PAUTA "
        "DE REUNIÃO prospectiva e objetiva, organizada em: 'A decidir', 'Bloqueado/aguardando' "
        "e 'Vence até a próxima reunião'. Itens curtos e acionáveis, em português. Não invente "
        "itens além do estado fornecido. " + _CNJ_RISCO
    )
    try:
        pauta = ia.chamar(system, f"ESTADO ATUAL:\n{estado}", max_tokens=800)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(502, str(exc)) from exc
    return {"pauta": pauta, "contadores": c}


@router.get("/ia/disponivel")
def ia_disponivel(ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    return {"disponivel": ia.disponivel()}
