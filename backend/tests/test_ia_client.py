"""Cliente de IA: disponibilidade, parsing e higiene de erro (sem vazar corpo)."""
import pytest

from app.core import ia
from app.core.config import settings


class FakeResp:
    def __init__(self, status_code: int, payload=None, text: str = ""):
        self.status_code = status_code
        self._payload = payload
        self.text = text

    def json(self):
        if self._payload is None:
            raise ValueError("sem json")
        return self._payload


def test_sem_chave_levanta_runtime(monkeypatch):
    monkeypatch.setattr(settings, "ai_api_key", "")
    with pytest.raises(RuntimeError):
        ia.chamar("sys", "user")


def test_disponivel_reflete_chave(monkeypatch):
    monkeypatch.setattr(settings, "ai_api_key", "")
    assert ia.disponivel() is False
    monkeypatch.setattr(settings, "ai_api_key", "k")
    assert ia.disponivel() is True


def test_erro_nao_vaza_corpo(monkeypatch):
    """Resposta 4xx não deve expor o corpo do provedor ao chamador."""
    monkeypatch.setattr(settings, "ai_api_key", "k")
    segredo = "DETALHE-INTERNO-DO-PROVEDOR-XYZ"
    monkeypatch.setattr(ia.httpx, "post", lambda *a, **k: FakeResp(429, text=segredo))
    with pytest.raises(ValueError) as exc:
        ia.chamar("s", "u")
    msg = str(exc.value)
    assert segredo not in msg
    assert "429" in msg


def test_sucesso_retorna_content(monkeypatch):
    monkeypatch.setattr(settings, "ai_api_key", "k")
    payload = {"choices": [{"message": {"content": "resposta final"}}]}
    monkeypatch.setattr(ia.httpx, "post", lambda *a, **k: FakeResp(200, payload=payload))
    assert ia.chamar("s", "u") == "resposta final"


def test_fallback_reasoning_content(monkeypatch):
    """Modelos de reasoning podem deixar o texto em reasoning_content."""
    monkeypatch.setattr(settings, "ai_api_key", "k")
    payload = {"choices": [{"message": {"content": "", "reasoning_content": "via reasoning"}}]}
    monkeypatch.setattr(ia.httpx, "post", lambda *a, **k: FakeResp(200, payload=payload))
    assert ia.chamar("s", "u") == "via reasoning"


def test_resposta_inesperada_generica(monkeypatch):
    monkeypatch.setattr(settings, "ai_api_key", "k")
    monkeypatch.setattr(ia.httpx, "post", lambda *a, **k: FakeResp(200, payload={"weird": 1}))
    with pytest.raises(ValueError) as exc:
        ia.chamar("s", "u")
    assert "inesperada" in str(exc.value).lower()
