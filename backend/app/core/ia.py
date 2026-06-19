"""Cliente de IA assistiva para resumos e Q&A no portal.

Usa a API compatível com OpenAI (Azure AI Foundry / DeepSeek-V4-Pro):
POST {base_url}/chat/completions com Authorization: Bearer <chave>.
A chave fica SOMENTE no backend. Mantém o humano no loop: a IA sugere/resume,
não decide. Sem chave configurada, levanta RuntimeError (o router responde 503).
"""
from __future__ import annotations

import httpx

from app.core.config import settings


def disponivel() -> bool:
    return bool(settings.ai_api_key)


def chamar(system: str, user: str, max_tokens: int | None = None) -> str:
    if not settings.ai_api_key:
        raise RuntimeError("IA não configurada: defina GOLDENDATA_AI_API_KEY no backend.")
    r = httpx.post(
        f"{settings.ai_base_url.rstrip('/')}/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.ai_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.ai_model,
            "max_tokens": max_tokens or settings.ai_max_tokens,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        },
        timeout=90,
    )
    if r.status_code >= 400:
        raise ValueError(f"Falha na IA ({r.status_code}): {r.text[:200]}")
    data = r.json()
    try:
        msg = data["choices"][0]["message"]
    except (KeyError, IndexError) as exc:
        raise ValueError(f"Resposta inesperada da IA: {str(data)[:200]}") from exc
    # modelos de reasoning podem separar conteúdo final de reasoning_content
    return (msg.get("content") or msg.get("reasoning_content") or "").strip()
