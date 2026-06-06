"""Worker de avaliação para processamento ASSÍNCRONO (12-factor / COARF >10s).

No MVP a importação de saídas e o cálculo de métricas são síncronos (datasets
pequenos, 50-500 casos). Para golden datasets grandes ou recálculo em lote, este
worker reaproveita a mesma lógica de serviço fora do ciclo de requisição.

Execução (exemplo): ``python -m app.workers.eval_worker recompute <run_id>``.
A integração com fila (arq/RQ + Redis) entra quando o volume exigir — a função
``recompute_run`` já é idempotente e isolável.
"""
from __future__ import annotations

import sys

from app.core.db import connection
from app.domain.evaluation.service import compute_aggregate


def recompute_run(run_id: str) -> dict[str, float]:
    """Recalcula as métricas agregadas de uma execução (idempotente)."""
    with connection(actor_sub="worker") as conn:
        return compute_aggregate(conn, run_id)


def main(argv: list[str]) -> int:
    if len(argv) >= 3 and argv[1] == "recompute":
        agg = recompute_run(argv[2])
        print(agg)
        return 0
    print("uso: python -m app.workers.eval_worker recompute <run_id>", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
