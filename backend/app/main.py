"""Aplicação FastAPI — goldendata (Registro 3.2 + Avaliação 3.3).

Back-end stateless, 12-factor, REST. Headers de segurança e CORS conforme CESEC.
"""
from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.config import settings
from app.core.db import execute
from app.core.deps import Ctx, get_ctx
from app.domain.evaluation.router import router as evaluation_router
from app.domain.governance.router import router as governance_router
from app.domain.registry.router import router as registry_router


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Cabeçalhos de segurança HTTP (OWASP / CESEC §5.2)."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'")
        response.headers.setdefault(
            "Strict-Transport-Security", f"max-age={settings.hsts_max_age}; includeSubDomains"
        )
        return response


app = FastAPI(
    title="goldendata — Governança e Qualidade de IA (TJMG)",
    version="0.1.0",
    description="Registro de Modelos/Ficha Técnica (3.2) + Avaliação Contínua de Qualidade (3.3).",
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(registry_router, prefix=settings.api_prefix)
app.include_router(evaluation_router, prefix=settings.api_prefix)
app.include_router(governance_router, prefix=settings.api_prefix)


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "service": settings.app_name, "env": settings.environment}


@app.get(f"{settings.api_prefix}/me", tags=["infra"])
def me(ctx: Ctx = Depends(get_ctx)) -> dict:
    """Registra/atualiza o usuário autenticado no espelho local (FK do RBAC)."""
    execute(
        ctx.conn,
        """INSERT INTO app_user (sub, nome, email, visto_em)
           VALUES (%s,%s,%s, now())
           ON CONFLICT (sub) DO UPDATE
             SET nome = EXCLUDED.nome, email = EXCLUDED.email, visto_em = now()""",
        (ctx.user.sub, ctx.user.nome, ctx.user.email),
    )
    return {"sub": ctx.user.sub, "nome": ctx.user.nome, "email": ctx.user.email, "roles": ctx.user.roles}
