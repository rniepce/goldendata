-- 0010 — Índices de performance (revisão de código, leva 2).
-- Não-bloqueante: preventivo para crescimento do acervo. IF NOT EXISTS p/ idempotência.

-- Agregação de métricas por execução (compute_aggregate / gate / dashboards)
CREATE INDEX IF NOT EXISTS idx_eval_result_run_metric
    ON eval_result (eval_run_id, metrica);

-- Contagem de comentários NÃO resolvidos por iniciativa (chip do painel + subquery)
CREATE INDEX IF NOT EXISTS idx_comentario_abertos
    ON comentario (iniciativa_id) WHERE NOT resolvido;

-- Busca global por código/nome de ferramenta (ILIKE %termo%) — trigram
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_tool_codigo_trgm
    ON tool USING gin (codigo_institucional gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tool_nome_trgm
    ON tool USING gin (nome gin_trgm_ops);
