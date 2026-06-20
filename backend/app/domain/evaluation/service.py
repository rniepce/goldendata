"""Serviço da Avaliação Contínua (3.3). Queries parametrizadas (CESEC)."""
from __future__ import annotations

from typing import Any

from psycopg.types.json import Jsonb

from app.core.db import execute, fetch_all, fetch_one
from app.metrics import levenshtein, normalized_similarity

from . import schemas
from .gate import HIGHER_IS_BETTER, evaluate_gate
from .metrics_runner import CasePair, aggregate, score_case


# --------------------------------------------------------------------------- #
# Golden datasets, rubricas e casos
# --------------------------------------------------------------------------- #
def create_rubric(conn: Any, body: schemas.RubricCreate, autor_sub: str) -> dict:
    return execute(
        conn,
        """INSERT INTO rubric (nome, versao, escala, dimensoes, labels, autor_sub)
           VALUES (%s,%s,%s,%s,%s,%s) RETURNING *""",
        (body.nome, body.versao, body.escala, Jsonb(body.dimensoes), Jsonb(body.labels), autor_sub),
    )


def create_golden_dataset(conn: Any, body: schemas.GoldenDatasetCreate, criado_por_sub: str) -> dict:
    return execute(
        conn,
        """INSERT INTO golden_dataset (tool_id, nome, dominio, versao, parent_version,
                                       changelog, origem_predominante, criado_por_sub)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (body.tool_id, body.nome, body.dominio, body.versao, body.parent_version,
         body.changelog, body.origem_predominante, criado_por_sub),
    )


def add_golden_case(conn: Any, dataset_id: str, body: schemas.GoldenCaseCreate) -> dict:
    grounding = dict(body.contexto_grounding)
    if body.citacoes_canonicas:
        grounding["citacoes_canonicas"] = body.citacoes_canonicas
    return execute(
        conn,
        """INSERT INTO golden_case (golden_dataset_id, input_prompt, contexto_grounding,
              saida_referencia, rubrica_id, criterios_aceitacao, dificuldade, categoria_risco,
              contem_pii, origem)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (dataset_id, body.input_prompt, Jsonb(grounding), body.saida_referencia, body.rubrica_id,
         body.criterios_aceitacao, body.dificuldade, body.categoria_risco, body.contem_pii, body.origem),
    )


# --------------------------------------------------------------------------- #
# Execução de avaliação (store-only) + métricas
# --------------------------------------------------------------------------- #
def create_eval_run(conn: Any, body: schemas.EvalRunCreate, iniciado_por_sub: str) -> dict:
    return execute(
        conn,
        """INSERT INTO eval_run (tool_version_id, golden_dataset_id, baseline_run_id, iniciado_por_sub)
           VALUES (%s,%s,%s,%s) RETURNING *""",
        (body.tool_version_id, body.golden_dataset_id, body.baseline_run_id, iniciado_por_sub),
    )


def import_outputs(conn: Any, run_id: str, body: schemas.OutputImport) -> dict:
    """Importa as saídas geradas (fora da plataforma) e calcula as métricas store-only."""
    run = fetch_one(conn, "SELECT * FROM eval_run WHERE id = %s", (run_id,))
    if run is None:
        raise ValueError("eval_run inexistente")

    # Pré-carrega todos os golden_cases em 1 query (evita N+1 no loop de importação).
    ids = [item.golden_case_id for item in body.outputs]
    casos = {
        str(c["id"]): c
        for c in fetch_all(conn, "SELECT * FROM golden_case WHERE id = ANY(%s)", (ids,))
    }

    scored = []
    for item in body.outputs:
        case = casos.get(str(item.golden_case_id))
        if case is None:
            raise ValueError(f"golden_case inexistente: {item.golden_case_id}")

        output = execute(
            conn,
            """INSERT INTO eval_output (eval_run_id, golden_case_id, texto_gerado, fonte_geracao)
               VALUES (%s,%s,%s,%s)
               ON CONFLICT (eval_run_id, golden_case_id)
               DO UPDATE SET texto_gerado = EXCLUDED.texto_gerado, fonte_geracao = EXCLUDED.fonte_geracao
               RETURNING *""",
            (run_id, item.golden_case_id, item.texto_gerado, item.fonte_geracao),
        )

        grounding = case.get("contexto_grounding") or {}
        canonical = grounding.get("citacoes_canonicas", []) if isinstance(grounding, dict) else []
        cs = score_case(CasePair(
            golden_case_id=str(case["id"]),
            referencia=case["saida_referencia"],
            gerado=item.texto_gerado,
            citacoes_canonicas=canonical,
        ))
        scored.append(cs)

        _insert_result(conn, run_id, case["id"], "deterministic", "exact_match", cs.exact_match)
        _insert_result(conn, run_id, case["id"], "statistical", "edit_distance", cs.edit_distance)
        _insert_result(conn, run_id, case["id"], "statistical", "similarity", cs.similarity)
        for c in cs.citacoes:
            execute(
                conn,
                """INSERT INTO citation_check (eval_output_id, citacao_extraida, status)
                   VALUES (%s,%s,%s)""",
                (output["id"], c["citacao"], c["status"]),
            )

    agg = aggregate(scored)
    execute(conn, "UPDATE eval_run SET status='concluida', concluido_em=now() WHERE id=%s", (run_id,))

    regression = None
    if run.get("baseline_run_id"):
        regression = _build_regression_report(conn, run_id, str(run["baseline_run_id"]), agg)

    return {"eval_run_id": run_id, "metricas": agg, "n_casos": len(scored), "regression": regression}


def _insert_result(conn: Any, run_id: str, case_id: str, avaliador: str, metrica: str, score: float) -> None:
    execute(
        conn,
        """INSERT INTO eval_result (eval_run_id, golden_case_id, avaliador, metrica, score)
           VALUES (%s,%s,%s,%s,%s)""",
        (run_id, case_id, avaliador, metrica, score),
    )


def compute_aggregate(conn: Any, run_id: str) -> dict[str, float]:
    """Recalcula as métricas agregadas de uma execução (usadas pelo gate e dashboards)."""
    agg: dict[str, float] = {}
    for row in fetch_all(
        conn,
        """SELECT metrica, AVG(score)::float AS media FROM eval_result
           WHERE eval_run_id = %s AND metrica IN ('exact_match','similarity','edit_distance')
           GROUP BY metrica""",
        (run_id,),
    ):
        agg[row["metrica"]] = row["media"]

    cit = fetch_one(
        conn,
        """SELECT count(*) FILTER (WHERE cc.status <> 'existe')::float
                  / nullif(count(*),0) AS taxa
           FROM citation_check cc
           JOIN eval_output eo ON eo.id = cc.eval_output_id
           WHERE eo.eval_run_id = %s""",
        (run_id,),
    )
    if cit and cit["taxa"] is not None:
        agg["taxa_citacao_invalida"] = cit["taxa"]

    ann = fetch_one(
        conn,
        """SELECT
             count(*) FILTER (WHERE ha.label='aceite')::float / nullif(count(*),0)  AS taxa_aceitacao,
             count(*) FILTER (WHERE ha.label='correcao')::float / nullif(count(*),0) AS taxa_correcao,
             count(*) FILTER (WHERE ha.label='rejeicao')::float / nullif(count(*),0) AS taxa_rejeicao,
             count(*) FILTER (WHERE ha.marcou_alucinacao)::float / nullif(count(*),0) AS taxa_alucinacao,
             AVG(ha.edit_distance)::float AS edit_distance_medio,
             AVG(ha.similarity)::float    AS similarity_media,
             count(*) AS n
           FROM human_annotation ha
           JOIN eval_output eo ON eo.id = ha.eval_output_id
           WHERE eo.eval_run_id = %s""",
        (run_id,),
    )
    if ann and ann["n"]:
        for k in ("taxa_aceitacao", "taxa_correcao", "taxa_rejeicao", "taxa_alucinacao"):
            if ann[k] is not None:
                agg[k] = ann[k]
    return agg


def _build_regression_report(conn: Any, run_id: str, baseline_id: str, agg: dict[str, float]) -> dict:
    base = compute_aggregate(conn, baseline_id)
    deltas, piores = {}, []
    for metrica, atual in agg.items():
        if metrica in base:
            delta = atual - base[metrica]
            deltas[metrica] = delta
            piorou = (delta < 0) if HIGHER_IS_BETTER.get(metrica, True) else (delta > 0)
            if piorou:
                piores.append(metrica)
    veredito = "regressao" if piores else "sem_regressao"
    return execute(
        conn,
        """INSERT INTO regression_report (eval_run_id, baseline_run_id, deltas_por_metrica,
              regressoes_detectadas, casos_que_pioraram, veredito)
           VALUES (%s,%s,%s,%s,%s,%s) RETURNING *""",
        (run_id, baseline_id, Jsonb(deltas), len(piores), Jsonb(piores), veredito),
    )


def get_run(conn: Any, run_id: str) -> dict | None:
    run = fetch_one(conn, "SELECT * FROM eval_run WHERE id = %s", (run_id,))
    if run is None:
        return None
    run["metricas"] = compute_aggregate(conn, run_id)
    run["outputs"] = fetch_all(
        conn, "SELECT * FROM eval_output WHERE eval_run_id = %s ORDER BY importado_em", (run_id,)
    )
    return run


# --------------------------------------------------------------------------- #
# Anotação humana (human-in-the-loop)
# --------------------------------------------------------------------------- #
def create_annotation(conn: Any, body: schemas.AnnotationCreate, annotator_sub: str) -> dict:
    output = fetch_one(conn, "SELECT * FROM eval_output WHERE id = %s", (body.eval_output_id,))
    if output is None:
        raise ValueError("eval_output inexistente")

    gerado = output["texto_gerado"]
    if body.label == "aceite":
        dist, sim = 0, 1.0
    elif body.texto_corrigido is not None:
        dist = levenshtein(gerado, body.texto_corrigido)
        sim = normalized_similarity(gerado, body.texto_corrigido)
    else:
        dist, sim = None, None

    return execute(
        conn,
        """INSERT INTO human_annotation (eval_output_id, annotator_sub, label, texto_gerado,
              texto_corrigido, edit_distance, similarity, marcou_alucinacao, justificativa, rubric_version)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (body.eval_output_id, annotator_sub, body.label, gerado, body.texto_corrigido,
         dist, sim, body.marcou_alucinacao, body.justificativa, body.rubric_version),
    )


# --------------------------------------------------------------------------- #
# KPIs de qualidade
# --------------------------------------------------------------------------- #
def compute_kpi_for_version(conn: Any, tool_id: str, tool_version_id: str) -> dict:
    """Consolida indicadores (taxa de aceitação/correção/alucinação etc.) por versão."""
    row = fetch_one(
        conn,
        """SELECT
             count(*) FILTER (WHERE ha.label='aceite')::float / nullif(count(*),0)  AS taxa_aceitacao,
             count(*) FILTER (WHERE ha.label='correcao')::float / nullif(count(*),0) AS taxa_correcao,
             count(*) FILTER (WHERE ha.label='rejeicao')::float / nullif(count(*),0) AS taxa_rejeicao,
             count(*) FILTER (WHERE ha.marcou_alucinacao)::float / nullif(count(*),0) AS taxa_alucinacao,
             AVG(ha.edit_distance)::float AS edit_distance_medio,
             AVG(ha.similarity)::float AS similarity_media,
             count(*) AS n
           FROM human_annotation ha
           JOIN eval_output eo ON eo.id = ha.eval_output_id
           JOIN eval_run er ON er.id = eo.eval_run_id
           WHERE er.tool_version_id = %s""",
        (tool_version_id,),
    ) or {}
    return execute(
        conn,
        """INSERT INTO kpi_quality (tool_id, tool_version_id, periodo_inicio, periodo_fim,
              taxa_aceitacao, taxa_correcao, taxa_rejeicao, edit_distance_medio, similarity_media,
              taxa_alucinacao, n_amostras)
           VALUES (%s,%s, CURRENT_DATE, CURRENT_DATE, %s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (tool_id, tool_version_id, row.get("taxa_aceitacao"), row.get("taxa_correcao"),
         row.get("taxa_rejeicao"), row.get("edit_distance_medio"), row.get("similarity_media"),
         row.get("taxa_alucinacao"), row.get("n") or 0),
    )


def list_kpi(conn: Any, tool_id: str) -> list[dict]:
    return fetch_all(
        conn, "SELECT * FROM kpi_quality WHERE tool_id = %s ORDER BY calculado_em DESC", (tool_id,)
    )


# --------------------------------------------------------------------------- #
# Gate de promoção a produção
# --------------------------------------------------------------------------- #
def create_gate(conn: Any, body: schemas.GateCreate, version_id: str) -> dict:
    agg = compute_aggregate(conn, body.eval_run_id)
    decision = evaluate_gate(body.metricas_exigidas, agg)
    return execute(
        conn,
        """INSERT INTO promotion_gate (tool_version_id, eval_run_id, metricas_exigidas,
              metricas_obtidas, resultado)
           VALUES (%s,%s,%s,%s,%s) RETURNING *""",
        (version_id, body.eval_run_id, Jsonb(body.metricas_exigidas),
         Jsonb(agg), decision.resultado),
    ) | {"checks": [c.as_dict() for c in decision.checks]}


def decide_gate(conn: Any, gate_id: str, body: schemas.GateDecide, aprovador_sub: str) -> dict:
    """Decisão humana sobre o gate. NÃO é possível promover uma versão que reprovou
    objetivamente no gate (supervisão humana não sobrepõe critério de segurança)."""
    gate = fetch_one(conn, "SELECT * FROM promotion_gate WHERE id = %s", (gate_id,))
    if gate is None:
        raise ValueError("gate inexistente")
    if body.aprovar and gate["resultado"] != "aprovado":
        raise PermissionError("Gate reprovado objetivamente: promoção bloqueada.")

    resultado = "aprovado" if body.aprovar else "reprovado"
    updated = execute(
        conn,
        """UPDATE promotion_gate SET resultado=%s, aprovador_sub=%s, justificativa=%s, decidido_em=now()
           WHERE id=%s RETURNING *""",
        (resultado, aprovador_sub, body.justificativa, gate_id),
    )
    if body.aprovar:
        execute(
            conn,
            """UPDATE tool_version SET lifecycle_stage='em_producao', promovido_em=now(),
               promovido_por_sub=%s WHERE id=%s""",
            (aprovador_sub, gate["tool_version_id"]),
        )
        execute(
            conn,
            """UPDATE tool SET status_ciclo_vida='em_producao', entrou_producao_em=now()
               WHERE id = (SELECT tool_id FROM tool_version WHERE id=%s)""",
            (gate["tool_version_id"],),
        )
    return updated
