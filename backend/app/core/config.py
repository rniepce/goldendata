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

    # Keycloak / OIDC
    oidc_issuer: str = "http://localhost:8080/realms/tjmg"
    oidc_audience: str = "goldendata-api"
    oidc_jwks_url: str = "http://localhost:8080/realms/tjmg/protocol/openid-connect/certs"
    # Em dev, permite desligar a verificação de assinatura. NUNCA em produção.
    auth_dev_insecure: bool = False

    # Segurança de saída
    hsts_max_age: int = 31536000  # 1 ano (CESEC §4.2)

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
