"""Assistente: busca global (catálogo + iniciativas + datasets) e IA assistiva
(resumo executivo de ficha técnica e Q&A em linguagem natural sobre o acervo).

A busca é determinística (SQL ILIKE). A IA é opcional (chave no backend) e mantém
o humano no loop — sugere/resume, não decide.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core import ia
from app.core.db import fetch_all
from app.core.deps import Ctx, get_ctx
from app.core.security_keycloak import require_role
from app.domain.registry import service as registry_svc

router = APIRouter(tags=["assistente"])

_READ = require_role("owner_ferramenta", "coordenador_comite", "avaliador", "auditor_dpo", "admin")


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
        f"Unidade: {f.get('unidade_responsavel')}\nCategoria de risco (CNJ 615): "
        f"{f.get('categoria_risco_cnj') or f.get('categoria_risco')}\n"
        f"Estágio: {f.get('estagio_gexia')}\nDescrição: {f.get('descricao')}\n"
        f"Riscos: {f.get('riscos_identificados')}\nObservações: {f.get('observacoes')}\n"
        f"Versões: {len(ficha.get('tool_versions') or [])} · "
        f"Itens de inventário de dados: {len(ficha.get('data_inventory') or [])}"
    )
    system = (
        "Você é um analista de governança de IA do TJMG. Resuma a ficha técnica em um "
        "parecer executivo curto (4-6 linhas), em português formal, destacando finalidade, "
        "categoria de risco e pontos de atenção. Não invente dados ausentes."
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
    tools = fetch_all(
        ctx.conn,
        """SELECT codigo_institucional, nome, unidade_responsavel, categoria_risco_cnj,
                  estagio_gexia, descricao FROM tool ORDER BY codigo_institucional""",
    )
    inics = fetch_all(
        ctx.conn,
        "SELECT titulo, categoria, status, responsavel_nome, prazo FROM iniciativa ORDER BY atualizado_em DESC",
    )
    ctx_tools = "\n".join(
        f"- [{t['codigo_institucional']}] {t['nome']} · unidade {t['unidade_responsavel']} · "
        f"risco {t.get('categoria_risco_cnj')} · estágio {t.get('estagio_gexia')} · {(t.get('descricao') or '')[:160]}"
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
        "conciso, em português, e cite os itens relevantes pelo nome/código."
    )
    user = f"CONTEXTO — FERRAMENTAS:\n{ctx_tools}\n\nCONTEXTO — INICIATIVAS:\n{ctx_inic}\n\nPERGUNTA: {body.pergunta}"
    try:
        resposta = ia.chamar(system, user, max_tokens=900)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(502, str(exc)) from exc
    return {"resposta": resposta}


@router.get("/ia/disponivel")
def ia_disponivel(ctx: Ctx = Depends(get_ctx), _=Depends(_READ)):
    return {"disponivel": ia.disponivel()}
