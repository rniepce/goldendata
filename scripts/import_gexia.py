#!/usr/bin/env python3
"""Importa o inventário de soluções do GEX-IA (export Notion CSV) para o goldendata.

Lê o CSV "Dossiês de Soluções — GEX-IA" exportado do Notion e cadastra cada
solução via API REST do backend (POST /api/registry/tools), de modo que cada
registro passe pelos gatilhos de auditoria (trilha encadeada por hash, CNJ 615).

Idempotente: consulta os códigos institucionais já cadastrados e pula os
existentes — pode ser reexecutado com segurança.

Uso:
    GOLDENDATA_API=https://goldendata-backend-production.up.railway.app \\
    python scripts/import_gexia.py "/caminho/Dossiês ... _all.csv" [--dry-run]
"""
from __future__ import annotations

import csv
import json
import os
import re
import sys
import urllib.error
import urllib.request

API = os.environ.get("GOLDENDATA_API", "http://localhost:8000").rstrip("/")

_MESES = {
    "janeiro": 1, "fevereiro": 2, "março": 3, "marco": 3, "abril": 4,
    "maio": 5, "junho": 6, "julho": 7, "agosto": 8, "setembro": 9,
    "outubro": 10, "novembro": 11, "dezembro": 12,
}


def parse_data_ptbr(valor: str) -> str | None:
    """'6 de março de 2026' -> '2026-03-06'. Ignora hora se houver."""
    if not valor or not valor.strip():
        return None
    txt = valor.strip().lower().split(" ")
    try:
        dia = int(txt[0])
        mes = _MESES.get(txt[2])
        ano = int(txt[4])
        if mes is None:
            return None
        return f"{ano:04d}-{mes:02d}-{dia:02d}"
    except (IndexError, ValueError):
        return None


def derivar_categoria_risco(cnj: str) -> str | None:
    """Taxonomia CNJ 615 -> enum alto/baixo.

    Casa os códigos AR1..AR5 (alto) e BR1..BR8 (baixo) pelo padrão letra+dígito,
    evitando falso-positivo em texto livre como "A confirmar" (que contém "ar").
    """
    up = (cnj or "").upper()
    if re.search(r"\bAR\d", up):
        return "alto"
    if re.search(r"\bBR\d", up):
        return "baixo"
    return None


def derivar_status_ciclo(estagio: str) -> str | None:
    """Estágio do dossiê -> lifecycle_stage do goldendata."""
    e = (estagio or "").lower()
    if "uso" in e:
        return "em_producao"
    if "suspenso" in e:
        return "suspenso"
    if "desenvolvimento" in e or "contrata" in e or "cooperação" in e:
        return "em_avaliacao"
    if "prototip" in e or "estudo" in e or "backlog" in e:
        return "rascunho"
    return None


def lista_riscos(valor: str) -> list[str]:
    if not valor or not valor.strip():
        return []
    return [r.strip() for r in valor.split(",") if r.strip()]


def limpar(valor: str | None) -> str | None:
    if valor is None:
        return None
    v = valor.strip()
    return v or None


def primeira_frase(texto: str | None, limite: int = 280) -> str | None:
    if not texto:
        return None
    t = texto.strip()
    return (t[:limite] + "…") if len(t) > limite else t


def montar_payload(row: dict) -> dict | None:
    nome = limpar(row.get("Nome da Solução"))
    if not nome:
        return None

    dossie = limpar(row.get("Nº Dossiê"))
    codigo = dossie or "GEXIA-" + nome.lower().replace(" ", "-")[:40]

    finalidade = limpar(row.get("Finalidade"))
    observacoes = limpar(row.get("Observações"))
    descricao = finalidade or primeira_frase(observacoes)

    cnj = limpar(row.get("Categoria de Risco")) or "A confirmar"

    return {
        "codigo_institucional": codigo,
        "nome": nome,
        "tipo": "ferramenta",
        "descricao": descricao,
        "unidade_responsavel": limpar(row.get("Área Solicitante")) or "Não informado",
        "categoria_risco": derivar_categoria_risco(cnj),
        "categoria_risco_cnj": cnj,
        "proxima_revisao_em": parse_data_ptbr(row.get("Data da Próxima Revisão", "")),
        "status_ciclo_vida": derivar_status_ciclo(row.get("Estágio", "")),
        "estagio_gexia": limpar(row.get("Estágio")),
        "fase_gexia": limpar(row.get("Tipo")),
        "desenvolvimento": limpar(row.get("Desenvolvimento")),
        "instituicao_parceira": limpar(row.get("Instituição Parceira de Desenvolvimento")),
        "interfaces_institucionais": limpar(row.get("Interfaces Institucionais Acionadas")),
        "riscos_identificados": lista_riscos(row.get("Riscos Identificados", "")),
        "proximos_passos": limpar(row.get("Próximos Passos")),
        "status_governanca": limpar(row.get("Status")),
        "analista_responsavel": limpar(row.get("Analista Responsável")),
        "documento_origem": limpar(row.get("Documento de Origem")),
        "data_analise": parse_data_ptbr(row.get("Data da Análise", "")),
        "observacoes": observacoes,
        "processo_sei": limpar(row.get("Processo SEI")),
        "origem_registro": "import_gexia_notion",
    }


def codigos_existentes() -> set[str]:
    req = urllib.request.Request(f"{API}/api/registry/tools")
    with urllib.request.urlopen(req, timeout=30) as resp:
        tools = json.load(resp)
    return {t.get("codigo_institucional") for t in tools}


def criar_tool(payload: dict) -> tuple[bool, str]:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{API}/api/registry/tools", data=data,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            obj = json.load(resp)
            return True, obj.get("id", "")
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.read().decode()[:300]}"
    except urllib.error.URLError as e:
        return False, f"URL error: {e}"


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    if not args:
        print("Uso: python scripts/import_gexia.py <caminho.csv> [--dry-run]")
        return 2
    csv_path = args[0]

    # utf-8-sig remove o BOM que o export do Notion coloca no 1º cabeçalho.
    with open(csv_path, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    payloads = [p for p in (montar_payload(r) for r in rows) if p]
    print(f"API: {API}")
    print(f"Linhas no CSV: {len(rows)} · soluções válidas: {len(payloads)}")

    if dry:
        for p in payloads:
            print(f"  - {p['codigo_institucional']:10} {p['nome'][:50]:50} "
                  f"risco={p['categoria_risco']} cnj={p['categoria_risco_cnj']} "
                  f"estagio={p['status_ciclo_vida']}")
        print("\n(dry-run — nada enviado)")
        return 0

    existentes = codigos_existentes()
    print(f"Já cadastrados: {len(existentes)}\n")

    ok = pulados = falhas = 0
    for p in payloads:
        if p["codigo_institucional"] in existentes:
            print(f"  ↷ pulado (já existe): {p['codigo_institucional']} {p['nome'][:45]}")
            pulados += 1
            continue
        sucesso, info = criar_tool(p)
        if sucesso:
            print(f"  ✓ {p['codigo_institucional']:10} {p['nome'][:45]}")
            ok += 1
        else:
            print(f"  ✗ {p['codigo_institucional']:10} {p['nome'][:45]} — {info}")
            falhas += 1

    print(f"\nResultado: {ok} criadas · {pulados} puladas · {falhas} falhas")
    return 1 if falhas else 0


if __name__ == "__main__":
    raise SystemExit(main())
