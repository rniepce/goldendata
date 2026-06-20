"""Aplicação FastAPI — goldendata (Registro 3.2 + Avaliação 3.3).

Back-end stateless, 12-factor, REST. Headers de segurança e CORS conforme CESEC.
"""
from __future__ import annotations

import secrets
from contextlib import AsyncExitStack, asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.db import execute, get_pool
from app.core.deps import Ctx, get_ctx
from app.domain.assistente.router import router as assistente_router
from app.domain.evaluation.router import router as evaluation_router
from app.domain.governance.router import router as governance_router
from app.domain.iniciativas.router import router as iniciativas_router
from app.domain.registry.router import router as registry_router
from app.mcp_server import mcp as mcp_server


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


class MCPAuthMiddleware(BaseHTTPMiddleware):
    """Exige Bearer token nas rotas do MCP quando GOLDENDATA_MCP_TOKEN está definido.

    Sem token configurado o MCP fica aberto (somente demo, coerente com auth_mode=none).
    Comparação em tempo constante (CESEC); aceita múltiplos tokens (rotação).
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path == "/mcp" or path.startswith("/mcp/"):
            tokens = settings.mcp_token_list
            if tokens:
                auth = request.headers.get("Authorization", "")
                presented = auth[7:].strip() if auth[:7].lower() == "bearer " else ""
                ok = bool(presented) and any(secrets.compare_digest(presented, t) for t in tokens)
                if not ok:
                    return JSONResponse({"detail": "MCP: token inválido ou ausente"}, status_code=401)
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Abre o session manager do MCP (Streamable HTTP) e o pool psycopg no startup."""
    async with AsyncExitStack() as stack:
        if settings.mcp_enabled:
            await stack.enter_async_context(mcp_server.session_manager.run())
        get_pool()  # inicializa o ConnectionPool (open=True) de forma determinística
        try:
            yield
        finally:
            get_pool().close()


app = FastAPI(
    title="goldendata — Governança e Qualidade de IA (TJMG)",
    version="0.1.0",
    description="Registro de Modelos/Ficha Técnica (3.2) + Avaliação Contínua de Qualidade (3.3).",
    lifespan=lifespan,
)

app.add_middleware(SecurityHeadersMiddleware)
# Com OAuth ligado, o próprio SDK protege /mcp (401 + WWW-Authenticate). O
# middleware de Bearer estático só atua quando o OAuth está desligado.
if settings.mcp_enabled and not settings.mcp_oauth_enabled:
    app.add_middleware(MCPAuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    # Explícito (sem '*'): API usa Authorization/Content-Type; demais são do MCP web.
    allow_headers=[
        "Authorization", "Content-Type", "Accept",
        "Mcp-Session-Id", "Mcp-Protocol-Version", "Last-Event-Id",
    ],
    expose_headers=["Mcp-Session-Id"],  # necessário p/ clientes browser do MCP
)

app.include_router(registry_router, prefix=settings.api_prefix)
app.include_router(evaluation_router, prefix=settings.api_prefix)
app.include_router(governance_router, prefix=settings.api_prefix)
app.include_router(iniciativas_router, prefix=settings.api_prefix)
app.include_router(assistente_router, prefix=settings.api_prefix)


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


# Servidor MCP montado por último: Mount("/") captura o que não casou acima.
# Endpoint efetivo: https://<host>/mcp (Streamable HTTP).
if settings.mcp_enabled:
    app.mount("/", mcp_server.streamable_http_app())
