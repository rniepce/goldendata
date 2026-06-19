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

    # Supabase Admin — gestão de usuários pela própria aplicação (área de Administração).
    # A service_role key é SECRETA e fica somente no backend (bypassa RLS). Necessária
    # para criar/listar/remover usuários via Admin API quando auth_mode=supabase.
    supabase_url: str = ""
    supabase_service_key: str = ""

    # Keycloak / OIDC (usados quando auth_mode=oidc)
    oidc_issuer: str = "http://localhost:8080/realms/tjmg"
    oidc_audience: str = "goldendata-api"
    oidc_jwks_url: str = "http://localhost:8080/realms/tjmg/protocol/openid-connect/certs"
    # Em dev, permite desligar a verificação de assinatura. NUNCA em produção.
    auth_dev_insecure: bool = False

    # Segurança de saída
    hsts_max_age: int = 31536000  # 1 ano (CESEC §4.2)

    # IA assistiva (resumos e Q&A no portal). Opcional: só funciona com chave.
    # A chave (Anthropic) é SECRETA e fica só no backend. Sem ela, os recursos de
    # IA respondem 503 com instrução — o resto da plataforma funciona normalmente.
    ai_api_key: str = ""
    ai_model: str = "claude-sonnet-4-6"
    ai_base_url: str = "https://api.anthropic.com"

    # MCP (Model Context Protocol) — servidor que permite a IAs operar a plataforma.
    mcp_enabled: bool = True
    # Token de acesso ao MCP. Se vazio, o MCP fica ABERTO (somente demo). Se
    # definido, toda chamada deve enviar este token (Authorization: Bearer ...).
    mcp_token: str = ""
    # Hosts permitidos no header Host do MCP (proteção anti DNS-rebinding do SDK).
    # CSV com o domínio público (ex.: "goldendata-backend-production.up.railway.app").
    # Se vazio, a proteção é desligada (apropriado para dev/local atrás de token+TLS).
    mcp_allowed_hosts: str = ""

    # OAuth do MCP — necessário para o connector do claude.ai (web/Desktop), que
    # só fala OAuth 2.1 + PKCE (não aceita Bearer estático). Authorization Server
    # embutido via o SDK do MCP. Mantém o token estático válido em paralelo (CLI).
    mcp_oauth_enabled: bool = False
    mcp_public_url: str = ""                   # URL pública do backend (issuer/resource)
    mcp_oauth_jwt_secret: str = ""             # HS256; gere com: openssl rand -hex 32
    mcp_oauth_token_ttl_seconds: int = 28800   # 8 h (sem refresh na demo; alinha com o sistema)
    mcp_oauth_code_ttl_seconds: int = 60       # 60 s (code de uso único)

    @property
    def mcp_token_list(self) -> list[str]:
        return [t.strip() for t in self.mcp_token.split(",") if t.strip()]

    @property
    def mcp_allowed_hosts_list(self) -> list[str]:
        return [h.strip() for h in self.mcp_allowed_hosts.split(",") if h.strip()]

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
