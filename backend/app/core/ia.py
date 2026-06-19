"""Cliente de IA assistiva (Anthropic Messages API) para resumos e Q&A no portal.

A chave fica SOMENTE no backend. Mantém o humano no loop: a IA sugere/resume,
não decide. Sem chave configurada, levanta RuntimeError (o router responde 503).
"""
from __future__ import annotations

import httpx

from app.core.config import settings


def disponivel() -> bool:
    return bool(settings.ai_api_key)


def chamar(system: str, user: str, max_tokens: int = 1024) -> str:
    if not settings.ai_api_key:
        raise RuntimeError("IA não configurada: defina GOLDENDATA_AI_API_KEY no backend.")
    r = httpx.post(
        f"{settings.ai_base_url.rstrip('/')}/v1/messages",
        headers={
            "x-api-key": settings.ai_api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": settings.ai_model,
            "max_tokens": max_tokens,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        },
        timeout=60,
    )
    if r.status_code >= 400:
        raise ValueError(f"Falha na IA ({r.status_code}): {r.text[:200]}")
    data = r.json()
    return "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()
