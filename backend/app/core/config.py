"""Configuração via variáveis de ambiente (12-factor — config fora do código)."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="GOLDENDATA_", env_file=".env", extra="ignore")

    # Aplicação
    app_name: str = "goldendata"
    environment: str = "dev"
    api_prefix: str = "/api"
    cors_origins: str = "http://localhost:5173"

    # Banco (Postgres — Supabase apenas como Postgres gerenciado no MVP)
    database_url: str = "postgresql://goldendata:goldendata@localhost:5432/goldendata"
    db_pool_min: int = 1
    db_pool_max: int = 10

    # Modo de autenticação:
    #   "none"  — SEM LOGIN (demonstração; todo acesso é um usuário demo com todos
    #             os papéis). NÃO usar com dados reais — qualquer pessoa com a URL
    #             lê e grava.
    #   "local" — e-mail+senha emitidos pelo próprio backend (MVP com login).
    #   "oidc"  — Keycloak (obrigatório na produção institucional, CESEC/CNJ 140).
    auth_mode: str = "none"
    # Segredo HS256 do modo local (obrigatório quando auth_mode=local).
    auth_secret: str = ""
    auth_token_ttl_hours: int = 8

    # Keycloak / OIDC (usados quando auth_mode=oidc)
    oidc_issuer: str = "http://localhost:8080/realms/tjmg"
    oidc_audience: str = "goldendata-api"
    oidc_jwks_url: str = "http://localhost:8080/realms/tjmg/protocol/openid-connect/certs"
    # Em dev, permite desligar a verificação de assinatura. NUNCA em produção.
    auth_dev_insecure: bool = False

    # Segurança de saída
    hsts_max_age: int = 31536000  # 1 ano (CESEC §4.2)

    # MCP (Model Context Protocol) — servidor que permite a IAs operar a plataforma.
    mcp_enabled: bool = True
    # Token de acesso ao MCP. Se vazio, o MCP fica ABERTO (somente demo). Se
    # definido, toda chamada deve enviar este token (Authorization: Bearer ...).
    mcp_token: str = ""

    @property
    def mcp_token_list(self) -> list[str]:
        return [t.strip() for t in self.mcp_token.split(",") if t.strip()]

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
