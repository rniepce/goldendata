"""Validação de segurança do schema de comentário (anexo-link)."""
import pytest
from pydantic import ValidationError

from app.domain.iniciativas.schemas import ComentarioCreate


def test_aceita_https():
    c = ComentarioCreate(texto="ok", anexo_url="https://sei.tjmg.jus.br/processo/123")
    assert c.anexo_url == "https://sei.tjmg.jus.br/processo/123"


def test_aceita_http():
    c = ComentarioCreate(texto="ok", anexo_url="http://intranet.tjmg/doc")
    assert c.anexo_url == "http://intranet.tjmg/doc"


def test_none_e_vazio_viram_none():
    assert ComentarioCreate(texto="ok").anexo_url is None
    assert ComentarioCreate(texto="ok", anexo_url="   ").anexo_url is None


@pytest.mark.parametrize(
    "url",
    [
        "javascript:alert(document.cookie)",
        "JavaScript:fetch('//atacante')",
        "data:text/html,<script>alert(1)</script>",
        "vbscript:msgbox(1)",
        "/caminho/relativo",
        "ftp://servidor/arquivo",
    ],
)
def test_rejeita_protocolos_inseguros(url):
    """Bloqueia XSS via href (javascript:/data:/vbscript:) e não-http(s)."""
    with pytest.raises(ValidationError):
        ComentarioCreate(texto="ok", anexo_url=url)


def test_texto_obrigatorio():
    with pytest.raises(ValidationError):
        ComentarioCreate(texto="", anexo_url="https://x")
