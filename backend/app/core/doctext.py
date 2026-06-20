"""Extração de texto de documentos enviados (#76/#77) e parsing tolerante de JSON.

As bibliotecas pesadas (pypdf, python-docx) são importadas SOB DEMANDA — a app
continua importável mesmo sem elas; um erro claro é levantado em runtime se
faltarem. TXT/MD são decodificados diretamente.
"""
from __future__ import annotations

import io
import json
import re
from typing import Any


def extrair_texto(filename: str, data: bytes) -> str:
    """Extrai texto de um documento (.pdf/.docx/.txt/.md). Demais tipos caem
    para decodificação utf-8 tolerante."""
    nome = (filename or "").lower()
    if nome.endswith(".pdf"):
        return _de_pdf(data)
    if nome.endswith(".docx"):
        return _de_docx(data)
    # txt, md, markdown, sem extensão, ou qualquer outro: trata como texto.
    return data.decode("utf-8", errors="replace").strip()


def _de_pdf(data: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:  # dependência opcional ausente
        raise RuntimeError("Suporte a PDF indisponível no servidor (instale pypdf).") from exc
    reader = PdfReader(io.BytesIO(data))
    return "\n".join((p.extract_text() or "") for p in reader.pages).strip()


def _de_docx(data: bytes) -> str:
    try:
        import docx  # python-docx
    except ImportError as exc:
        raise RuntimeError("Suporte a DOCX indisponível no servidor (instale python-docx).") from exc
    documento = docx.Document(io.BytesIO(data))
    return "\n".join(p.text for p in documento.paragraphs).strip()


def parse_primeiro_json(texto: str) -> dict[str, Any]:
    """Extrai o primeiro objeto JSON de uma resposta da IA (que pode vir cercada
    de texto/```json). Retorna {} se não houver JSON válido."""
    if not texto:
        return {}
    m = re.search(r"\{.*\}", texto, re.S)
    if not m:
        return {}
    try:
        valor = json.loads(m.group(0))
    except (json.JSONDecodeError, ValueError):
        return {}
    return valor if isinstance(valor, dict) else {}
