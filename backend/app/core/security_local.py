"""Autenticação LOCAL (e-mail + senha) para o MVP — modo alternativo ao OIDC.

- Senhas com **PBKDF2-HMAC-SHA-256** (CESEC §4.2; stdlib, sem dependências).
- Tokens **JWT HS256** emitidos pelo próprio backend (claims: sub/nome/email/roles).
- **Rate limiting**: bloqueio após 5 tentativas incorretas (CESEC §2.2),
  janela de 15 minutos, por e-mail+IP (em memória; suficiente para o MVP).

Produção institucional deve voltar ao Keycloak/OIDC + MFA — basta trocar
``GOLDENDATA_AUTH_MODE`` para ``oidc`` (Portaria CNJ 140/2024).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import time
from datetime import UTC, datetime, timedelta

import jwt

from .config import settings

# --------------------------------------------------------------------------- #
# Senhas (PBKDF2-HMAC-SHA-256)
# --------------------------------------------------------------------------- #
_ALGO = "pbkdf2_sha256"
_ITERATIONS = 600_000  # recomendação OWASP para PBKDF2-HMAC-SHA256


def hash_password(senha: str) -> str:
    """Gera o hash no formato ``pbkdf2_sha256$<iterações>$<salt_b64>$<hash_b64>``."""
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", senha.encode(), salt, _ITERATIONS)
    return "$".join(
        (_ALGO, str(_ITERATIONS), base64.b64encode(salt).decode(), base64.b64encode(dk).decode())
    )


def verify_password(senha: str, stored: str) -> bool:
    try:
        algo, iters, salt_b64, hash_b64 = stored.split("$")
        if algo != _ALGO:
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256", senha.encode(), base64.b64decode(salt_b64), int(iters)
        )
        return hmac.compare_digest(dk, base64.b64decode(hash_b64))
    except (ValueError, TypeError):
        return False


# --------------------------------------------------------------------------- #
# Tokens (JWT HS256 emitido pelo backend)
# --------------------------------------------------------------------------- #
_ISSUER = "goldendata-local"


def issue_token(sub: str, nome: str, email: str | None, roles: list[str]) -> str:
    if not settings.auth_secret:
        raise RuntimeError("GOLDENDATA_AUTH_SECRET não configurado para o modo local.")
    now = datetime.now(UTC)
    payload = {
        "iss": _ISSUER,
        "sub": sub,
        "name": nome,
        "email": email,
        "roles": roles,
        "iat": now,
        "exp": now + timedelta(hours=settings.auth_token_ttl_hours),
    }
    return jwt.encode(payload, settings.auth_secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    """Valida assinatura/expiração e retorna as claims. Levanta jwt.PyJWTError."""
    return jwt.decode(
        token,
        settings.auth_secret,
        algorithms=["HS256"],
        issuer=_ISSUER,
        options={"require": ["exp", "iat", "sub"]},
    )


# --------------------------------------------------------------------------- #
# Rate limiting (5 tentativas → bloqueio de 15 min) — CESEC §2.2
# --------------------------------------------------------------------------- #
_MAX_ATTEMPTS = 5
_LOCK_SECONDS = 15 * 60
_attempts: dict[str, list[float]] = {}


def _key(email: str, ip: str | None) -> str:
    return f"{email.lower()}|{ip or '-'}"


def is_locked(email: str, ip: str | None, now: float | None = None) -> bool:
    now = now if now is not None else time.monotonic()
    window = [t for t in _attempts.get(_key(email, ip), []) if now - t < _LOCK_SECONDS]
    return len(window) >= _MAX_ATTEMPTS


def register_failure(email: str, ip: str | None, now: float | None = None) -> None:
    now = now if now is not None else time.monotonic()
    k = _key(email, ip)
    window = [t for t in _attempts.get(k, []) if now - t < _LOCK_SECONDS]
    window.append(now)
    _attempts[k] = window


def reset_attempts(email: str, ip: str | None) -> None:
    _attempts.pop(_key(email, ip), None)
