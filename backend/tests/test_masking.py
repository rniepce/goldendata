from app.core.masking import mask_cpf


def test_mask_cpf_formatted():
    assert mask_cpf("123.777.888-09") == "***.777.888-**"


def test_mask_cpf_unformatted():
    assert mask_cpf("12377788809") == "***.777.888-**"


def test_mask_cpf_inside_text():
    out = mask_cpf("Parte: João, CPF 123.777.888-09, autos...")
    assert "***.777.888-**" in out
    assert "123.777.888-09" not in out
