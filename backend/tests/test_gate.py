from app.domain.evaluation.gate import evaluate_gate
from app.domain.evaluation.metrics_runner import CasePair, aggregate, score_case


def test_gate_higher_is_better_pass_and_fail():
    exig = {"similarity": 0.8, "exact_match": 0.5}
    assert evaluate_gate(exig, {"similarity": 0.9, "exact_match": 0.6}).aprovado is True
    assert evaluate_gate(exig, {"similarity": 0.7, "exact_match": 0.6}).aprovado is False


def test_gate_lower_is_better():
    exig = {"taxa_citacao_invalida": 0.1, "edit_distance": 50}
    assert evaluate_gate(exig, {"taxa_citacao_invalida": 0.05, "edit_distance": 40}).aprovado is True
    assert evaluate_gate(exig, {"taxa_citacao_invalida": 0.2, "edit_distance": 40}).aprovado is False


def test_gate_fail_closed_when_metric_missing_or_no_criteria():
    # métrica exigida ausente => reprova
    assert evaluate_gate({"similarity": 0.8}, {}).aprovado is False
    # sem critérios => reprova (não promove às cegas)
    assert evaluate_gate({}, {"similarity": 0.99}).aprovado is False


def test_metrics_runner_score_and_aggregate():
    pairs = [
        CasePair("c1", "A sentença foi mantida.", "A sentença foi mantida."),
        CasePair("c2", "Defiro o pedido.", "Indefiro o pedido."),
    ]
    scores = [score_case(p) for p in pairs]
    assert scores[0].exact_match == 1.0
    assert scores[1].exact_match == 0.0
    agg = aggregate(scores)
    assert 0.0 <= agg["similarity"] <= 1.0
    assert agg["exact_match"] == 0.5
