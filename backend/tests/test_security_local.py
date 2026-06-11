import jwt
import pytest

from app.core import security_local
from app.core.config import settings


def test_hash_and_verify_roundtrip():
    stored = security_local.hash_password("senha-de-teste-bem-longa")
    assert stored.startswith("pbkdf2_sha256$600000$")
    assert security_local.verify_password("senha-de-teste-bem-longa", stored) is True
    assert security_local.verify_password("senha-errada-tambem-longa", stored) is False


def test_verify_rejects_malformed_hash():
    assert security_local.verify_password("qualquer", "formato-invalido") is False
    assert security_local.verify_password("qualquer", "") is False


def test_token_roundtrip(monkeypatch):
    monkeypatch.setattr(settings, "auth_secret", "segredo-de-teste")
    token = security_local.issue_token("sub-1", "Fulano", "f@tjmg.jus.br", ["avaliador"])
    claims = security_local.decode_token(token)
    assert claims["sub"] == "sub-1"
    assert claims["roles"] == ["avaliador"]
    assert claims["iss"] == "goldendata-local"


def test_token_wrong_secret_rejected(monkeypatch):
    monkeypatch.setattr(settings, "auth_secret", "segredo-a")
    token = security_local.issue_token("sub-1", "Fulano", None, [])
    monkeypatch.setattr(settings, "auth_secret", "segredo-b")
    with pytest.raises(jwt.PyJWTError):
        security_local.decode_token(token)


def test_issue_requires_secret(monkeypatch):
    monkeypatch.setattr(settings, "auth_secret", "")
    with pytest.raises(RuntimeError):
        security_local.issue_token("s", "n", None, [])


def test_rate_limiting_locks_after_5_failures():
    email, ip = "teste@tjmg.jus.br", "10.0.0.1"
    security_local.reset_attempts(email, ip)
    t0 = 1000.0
    assert security_local.is_locked(email, ip, now=t0) is False
    for i in range(5):
        security_local.register_failure(email, ip, now=t0 + i)
    assert security_local.is_locked(email, ip, now=t0 + 10) is True
    # fora da janela de 15 min, desbloqueia
    assert security_local.is_locked(email, ip, now=t0 + 15 * 60 + 10) is False
    security_local.reset_attempts(email, ip)
