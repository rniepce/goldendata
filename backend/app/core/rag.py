"""RAG léxico sobre a base de conhecimento (Estágio 0 do Tier S).

Retrieval por full-text 'portuguese' (websearch_to_tsquery + ts_rank_cd) com
reforço por similaridade trigram (pg_trgm) quando a busca lexical não casa. Sem
embeddings/pgvector — Postgres puro, portável on-prem (diretriz COARF). O upgrade
para retrieval vetorial é evolução futura, sem mudar a interface deste módulo.

Funções puras (chunking) ficam aqui para serem testáveis sem banco.
"""
from __future__ import annotations

import re
from typing import Any

from app.core.db import fetch_all

# --------------------------------------------------------------------------- #
# Chunking — fatiamento determinístico do conteúdo (puro, testável)
# --------------------------------------------------------------------------- #


def _split_long(paragrafo: str, max_chars: int) -> list[str]:
    """Quebra um parágrafo maior que ``max_chars`` por sentenças (e, em último
    caso, por tamanho), agrupando até o limite."""
    sentencas = re.split(r"(?<=[.!?])\s+", paragrafo)
    saida: list[str] = []
    buf = ""
    for s in sentencas:
        while len(s) > max_chars:  # sentença gigante: corta no limite
            saida.append(s[:max_chars])
            s = s[max_chars:]
        if buf and len(buf) + 1 + len(s) > max_chars:
            saida.append(buf)
            buf = s
        else:
            buf = f"{buf} {s}" if buf else s
    if buf:
        saida.append(buf)
    return saida


def chunk_text(texto: str, max_chars: int = 800) -> list[str]:
    """Fatia o texto em pedaços coesos (<= ~max_chars), respeitando parágrafos.

    Parágrafos são separados por linha em branco; pedaços curtos são agrupados e
    parágrafos longos são subdivididos por sentença. Determinístico.
    """
    texto = (texto or "").strip()
    if not texto:
        return []
    paragrafos = [p.strip() for p in re.split(r"\n\s*\n", texto) if p.strip()]
    chunks: list[str] = []
    buf = ""
    for p in paragrafos:
        if len(p) > max_chars:
            if buf:
                chunks.append(buf)
                buf = ""
            chunks.extend(_split_long(p, max_chars))
            continue
        if buf and len(buf) + 1 + len(p) > max_chars:
            chunks.append(buf)
            buf = p
        else:
            buf = f"{buf}\n{p}" if buf else p
    if buf:
        chunks.append(buf)
    return chunks


# --------------------------------------------------------------------------- #
# Retrieval — busca dos trechos mais relevantes na base de conhecimento
# --------------------------------------------------------------------------- #


def retrieve(
    conn: Any, query: str, k: int = 6, tipos: list[str] | None = None
) -> list[dict]:
    """Retorna até ``k`` trechos mais relevantes para ``query`` entre documentos
    ativos. Tenta full-text 'portuguese'; se não casar, cai para trigram."""
    termo = (query or "").strip()
    if not termo:
        return []

    sql = [
        "SELECT c.documento_id, d.titulo, d.tipo::text AS tipo, c.ordem, c.texto,",
        "       ts_rank_cd(c.tsv, q) AS score",
        "FROM documento_chunk c",
        "JOIN documento d ON d.id = c.documento_id,",
        "     websearch_to_tsquery('portuguese', %s) q",
        "WHERE d.ativo AND c.tsv @@ q",
    ]
    params: list[Any] = [termo]
    if tipos:
        sql.append("AND d.tipo::text = ANY(%s)")
        params.append(list(tipos))
    sql.append("ORDER BY score DESC LIMIT %s")
    params.append(k)
    linhas = fetch_all(conn, "\n".join(sql), tuple(params))
    if linhas:
        return linhas

    # Fallback trigram (pg_trgm): pega aproximações quando o léxico exato falha.
    sql_fb = [
        "SELECT c.documento_id, d.titulo, d.tipo::text AS tipo, c.ordem, c.texto,",
        "       similarity(c.texto, %s) AS score",
        "FROM documento_chunk c",
        "JOIN documento d ON d.id = c.documento_id",
        "WHERE d.ativo AND similarity(c.texto, %s) > 0.05",
    ]
    params_fb: list[Any] = [termo, termo]
    if tipos:
        sql_fb.append("AND d.tipo::text = ANY(%s)")
        params_fb.append(list(tipos))
    sql_fb.append("ORDER BY score DESC LIMIT %s")
    params_fb.append(k)
    return fetch_all(conn, "\n".join(sql_fb), tuple(params_fb))


def build_context(chunks: list[dict]) -> tuple[str, list[dict]]:
    """Monta o bloco de contexto numerado para o prompt e a lista de fontes
    (deduplicadas por documento, preservando a ordem de relevância).

    Retorna (contexto, fontes). As fontes são citáveis pelo índice [n].
    """
    if not chunks:
        return "", []
    fontes: list[dict] = []
    indice_por_doc: dict[str, int] = {}
    blocos: list[str] = []
    for ch in chunks:
        doc_id = str(ch["documento_id"])
        if doc_id not in indice_por_doc:
            indice_por_doc[doc_id] = len(fontes) + 1
            fontes.append(
                {"documento_id": doc_id, "titulo": ch["titulo"], "tipo": ch["tipo"]}
            )
        n = indice_por_doc[doc_id]
        blocos.append(f"[{n}] ({ch['tipo']}) {ch['titulo']}\n{ch['texto']}")
    return "\n\n".join(blocos), fontes
