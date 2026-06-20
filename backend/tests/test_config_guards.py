"""Guards de configuração no startup (defesa em profundidade)."""
import pytest
from pydantic import ValidationError

from app.core.config import Settings


def _mk(**kw) -> Settings:
    # _env_file=None isola de um .env local; kwargs têm prioridade sobre env vars.
    return Settings(_env_file=None, **kw)


def test_dev_permite_auth_inseguro():
    s = _mk(environment="dev", auth_mode="none", auth_dev_insecure=True)
    assert s.auth_mode == "none"


def test_prod_recusa_auth_mode_none():
    with pytest.raises(ValidationError):
        _mk(environment="production", auth_mode="none")


def test_prod_recusa_dev_insecure():
    with pytest.raises(ValidationError):
        _mk(environment="production", auth_mode="supabase", auth_dev_insecure=True)


def test_homolog_recusa_dev_insecure():
    with pytest.raises(ValidationError):
        _mk(environment="homolog", auth_mode="supabase", auth_dev_insecure=True)


def test_prod_supabase_seguro_ok():
    s = _mk(environment="production", auth_mode="supabase", auth_dev_insecure=False)
    assert s.auth_mode == "supabase"


def test_mcp_oauth_exige_segredo():
    with pytest.raises(ValidationError):
        _mk(environment="dev", mcp_oauth_enabled=True, mcp_oauth_jwt_secret="")


def test_mcp_oauth_com_segredo_ok():
    s = _mk(environment="dev", mcp_oauth_enabled=True, mcp_oauth_jwt_secret="a" * 64)
    assert s.mcp_oauth_enabled is True
