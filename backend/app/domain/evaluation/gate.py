"""Gate de promoção a produção (CNJ 615 Art. 9 §1º).

Lógica PURA e testável: dada a configuração de thresholds e as métricas obtidas
na execução de avaliação, decide se a versão PODE ser promovida. A decisão final
ainda exige aprovação humana (supervisão humana — Art. 32/34), mas o gate barra
objetivamente versões abaixo do critério.
"""
from __future__ import annotations

from dataclasses import dataclass

# Direção de cada métrica: True = maior é melhor; False = menor é melhor.
HIGHER_IS_BETTER: dict[str, bool] = {
    "exact_match": True,
    "similarity": True,
    "rouge_l": True,
    "bleu": True,
    "bertscore": True,
    "faithfulness": True,
    "rubrica": True,
    "taxa_aceitacao": True,
    "edit_distance": False,
    "taxa_correcao": False,
    "taxa_alucinacao": False,
    "taxa_citacao_invalida": False,
    "citation": False,  # nº de citações inválidas
}


@dataclass
class MetricCheck:
    metrica: str
    threshold: float
    obtido: float | None
    passou: bool

    def as_dict(self) -> dict:
        return {
            "metrica": self.metrica,
            "threshold": self.threshold,
            "obtido": self.obtido,
            "passou": self.passou,
        }


@dataclass
class GateDecision:
    aprovado: bool
    checks: list[MetricCheck]

    @property
    def resultado(self) -> str:
        return "aprovado" if self.aprovado else "reprovado"

    def as_dict(self) -> dict:
        return {"resultado": self.resultado, "checks": [c.as_dict() for c in self.checks]}


def _passes(metrica: str, threshold: float, obtido: float | None) -> bool:
    if obtido is None:
        return False  # métrica exigida ausente => reprova (fail-closed)
    if HIGHER_IS_BETTER.get(metrica, True):
        return obtido >= threshold
    return obtido <= threshold


def evaluate_gate(metricas_exigidas: dict[str, float], metricas_obtidas: dict[str, float]) -> GateDecision:
    """Aprova somente se TODAS as métricas exigidas satisfizerem seus thresholds.

    Falha fechada: se não houver nenhuma métrica exigida, o gate REPROVA (não se
    promove às cegas) — força o avaliador a definir critérios objetivos.
    """
    if not metricas_exigidas:
        return GateDecision(aprovado=False, checks=[])

    checks: list[MetricCheck] = []
    for metrica, threshold in metricas_exigidas.items():
        obtido = metricas_obtidas.get(metrica)
        checks.append(MetricCheck(metrica, float(threshold), obtido, _passes(metrica, float(threshold), obtido)))

    return GateDecision(aprovado=all(c.passou for c in checks), checks=checks)
