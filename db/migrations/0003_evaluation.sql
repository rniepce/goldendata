-- =============================================================================
-- goldendata — 0003 — Avaliação Contínua de Qualidade (necessidade 3.3)
-- Golden datasets versionados, execuções store-only, métricas determinísticas/
-- estatísticas, anotação humana (aceite/correção/rejeição), gate de produção.
-- Referências: CNJ 615/2025 (Art. 9 §1º gate, Art. 32/34 supervisão, Art. 42 incidentes),
-- práticas de golden datasets / faithfulness / κ-α.
-- =============================================================================

-- Rubrica de avaliação versionada. Mudar a rubrica invalida comparações históricas
-- => rubric_version é gravada em cada resultado/anotação.
CREATE TABLE rubric (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            text        NOT NULL,
    versao          text        NOT NULL,
    escala          rubric_scale NOT NULL,
    dimensoes       jsonb       NOT NULL DEFAULT '[]'::jsonb,  -- [{criterio, descricao, peso}]
    labels          jsonb       NOT NULL DEFAULT '{}'::jsonb,  -- definição de cada nível da escala
    autor_sub       text        NOT NULL,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (nome, versao)
);

-- Conjunto de referência (golden dataset) versionado, atrelado a uma ferramenta.
CREATE TABLE golden_dataset (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id             uuid NOT NULL REFERENCES tool(id) ON DELETE CASCADE,
    nome                text NOT NULL,
    dominio             dataset_domain NOT NULL,
    versao              text NOT NULL,
    parent_version      uuid REFERENCES golden_dataset(id),
    changelog           text,
    origem_predominante case_origin NOT NULL DEFAULT 'sintetico',
    ativo               boolean NOT NULL DEFAULT true,
    criado_por_sub      text NOT NULL,
    criado_em           timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tool_id, nome, versao)
);
CREATE INDEX idx_golden_dataset_tool ON golden_dataset (tool_id);

-- Caso de teste: input + saída de referência (gabarito) + rubrica.
CREATE TABLE golden_case (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    golden_dataset_id   uuid NOT NULL REFERENCES golden_dataset(id) ON DELETE CASCADE,
    input_prompt        text NOT NULL,
    contexto_grounding  jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {doc_ids, fontes, janela_freshness}
    saida_referencia    text NOT NULL,                       -- gabarito
    rubrica_id          uuid REFERENCES rubric(id),
    criterios_aceitacao text,
    dificuldade         smallint CHECK (dificuldade BETWEEN 1 AND 5),
    categoria_risco     risk_category,
    contem_pii          boolean NOT NULL DEFAULT false,      -- classificação PII antes de persistir (LGPD)
    origem              case_origin NOT NULL DEFAULT 'sintetico',
    criado_em           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_golden_case_dataset ON golden_case (golden_dataset_id);

-- Execução de avaliação de uma versão sobre um golden dataset (store-only).
CREATE TABLE eval_run (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_version_id     uuid NOT NULL REFERENCES tool_version(id) ON DELETE CASCADE,
    golden_dataset_id   uuid NOT NULL REFERENCES golden_dataset(id),
    disparo             eval_trigger NOT NULL DEFAULT 'importacao',
    baseline_run_id     uuid REFERENCES eval_run(id),
    status              text NOT NULL DEFAULT 'criada',       -- criada | processando | concluida | falha
    iniciado_por_sub    text NOT NULL,
    iniciado_em         timestamptz NOT NULL DEFAULT now(),
    concluido_em        timestamptz
);
CREATE INDEX idx_eval_run_version ON eval_run (tool_version_id);

-- Saída gerada importada por caso (store-only: a plataforma NÃO chama o modelo).
CREATE TABLE eval_output (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    eval_run_id     uuid NOT NULL REFERENCES eval_run(id) ON DELETE CASCADE,
    golden_case_id  uuid NOT NULL REFERENCES golden_case(id),
    texto_gerado    text NOT NULL,
    fonte_geracao   text,                                    -- de onde veio a saída (ferramenta/execução externa)
    importado_em    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (eval_run_id, golden_case_id)
);
CREATE INDEX idx_eval_output_run ON eval_output (eval_run_id);

-- Score por caso por avaliador plugável (determinístico/estatístico/humano/...).
CREATE TABLE eval_result (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    eval_run_id     uuid NOT NULL REFERENCES eval_run(id) ON DELETE CASCADE,
    golden_case_id  uuid NOT NULL REFERENCES golden_case(id),
    avaliador       evaluator_type NOT NULL,
    metrica         metric_type NOT NULL,
    score           numeric(8,5) NOT NULL,
    peso            numeric(5,3) NOT NULL DEFAULT 1.0,
    rubric_version  text,
    detalhe         jsonb NOT NULL DEFAULT '{}'::jsonb,
    criado_em       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_eval_result_run ON eval_result (eval_run_id);
CREATE INDEX idx_eval_result_case ON eval_result (golden_case_id);

-- Verificação determinística de citações de jurisprudência/legislação.
CREATE TABLE citation_check (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    eval_output_id      uuid NOT NULL REFERENCES eval_output(id) ON DELETE CASCADE,
    citacao_extraida    text NOT NULL,
    status              citation_status NOT NULL,
    base_consultada     text,
    detalhe             jsonb NOT NULL DEFAULT '{}'::jsonb,
    criado_em           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_citation_check_output ON citation_check (eval_output_id);

-- Anotação humana (human-in-the-loop): aceite | correção | rejeição.
CREATE TABLE human_annotation (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    eval_output_id      uuid REFERENCES eval_output(id) ON DELETE CASCADE,
    production_event_id uuid,                               -- FK adicionada após production_event
    annotator_sub       text NOT NULL,
    label               annotation_label NOT NULL,
    texto_gerado        text,
    texto_corrigido     text,
    edit_distance       integer,                            -- distância de edição gerado→corrigido
    similarity          numeric(6,5),                       -- 0..1
    marcou_alucinacao   boolean NOT NULL DEFAULT false,
    justificativa       text,
    rubric_version      text,
    criado_em           timestamptz NOT NULL DEFAULT now(),
    CHECK (eval_output_id IS NOT NULL OR production_event_id IS NOT NULL)
);
CREATE INDEX idx_human_annotation_output ON human_annotation (eval_output_id);
CREATE INDEX idx_human_annotation_annotator ON human_annotation (annotator_sub);

-- Captura de produção (modelada já; preenchida por SDK/telemetria na Fase 2).
CREATE TABLE production_event (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id             uuid NOT NULL REFERENCES tool(id) ON DELETE CASCADE,
    tool_version_id     uuid REFERENCES tool_version(id),
    prompt_version_id   uuid REFERENCES prompt_version(id),
    usuario_sub         text,                               -- servidor/magistrado revisor
    texto_gerado        text NOT NULL,
    texto_publicado     text,
    label_humano        annotation_label,
    edit_distance       integer,
    similarity          numeric(6,5),
    criado_em           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_production_event_tool ON production_event (tool_id);

ALTER TABLE human_annotation
    ADD CONSTRAINT fk_annotation_production
    FOREIGN KEY (production_event_id) REFERENCES production_event(id) ON DELETE CASCADE;

-- Concordância entre avaliadores (alerta quando < ~0,6).
CREATE TABLE inter_annotator_agreement (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    golden_dataset_id   uuid NOT NULL REFERENCES golden_dataset(id) ON DELETE CASCADE,
    lote                text NOT NULL,
    metrica             iaa_metric NOT NULL,
    valor               numeric(6,5) NOT NULL,
    n_anotadores        smallint NOT NULL,
    abaixo_threshold    boolean NOT NULL DEFAULT false,
    criado_em           timestamptz NOT NULL DEFAULT now()
);

-- Relatório de regressão: deltas vs. baseline.
CREATE TABLE regression_report (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    eval_run_id         uuid NOT NULL REFERENCES eval_run(id) ON DELETE CASCADE,
    baseline_run_id     uuid REFERENCES eval_run(id),
    deltas_por_metrica  jsonb NOT NULL DEFAULT '{}'::jsonb,
    regressoes_detectadas integer NOT NULL DEFAULT 0,
    casos_que_pioraram  jsonb NOT NULL DEFAULT '[]'::jsonb,
    veredito            text,
    criado_em           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_regression_report_run ON regression_report (eval_run_id);

-- Gate de produção: thresholds x métricas, decisão humana.
CREATE TABLE promotion_gate (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_version_id     uuid NOT NULL REFERENCES tool_version(id) ON DELETE CASCADE,
    eval_run_id         uuid NOT NULL REFERENCES eval_run(id),
    metricas_exigidas   jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {metrica: threshold}
    metricas_obtidas    jsonb NOT NULL DEFAULT '{}'::jsonb,
    resultado           gate_result NOT NULL DEFAULT 'pendente',
    aprovador_sub       text,
    justificativa       text,
    regression_report_id uuid REFERENCES regression_report(id),
    decidido_em         timestamptz,
    criado_em           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_promotion_gate_version ON promotion_gate (tool_version_id);

-- Indicadores de qualidade (rollup por ferramenta/versão/período).
CREATE TABLE kpi_quality (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id                 uuid NOT NULL REFERENCES tool(id) ON DELETE CASCADE,
    tool_version_id         uuid REFERENCES tool_version(id) ON DELETE CASCADE,
    periodo_inicio          date NOT NULL,
    periodo_fim             date NOT NULL,
    taxa_aceitacao          numeric(6,5),
    taxa_correcao           numeric(6,5),
    taxa_rejeicao           numeric(6,5),
    edit_distance_medio     numeric(10,3),
    similarity_media        numeric(6,5),
    taxa_alucinacao         numeric(6,5),
    taxa_citacao_invalida   numeric(6,5),
    n_amostras              integer NOT NULL DEFAULT 0,
    calculado_em            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_kpi_quality_tool ON kpi_quality (tool_id, periodo_inicio);

-- Evento adverso / incidente com SLA de 72h (CNJ 615 Art. 42 §2º).
CREATE TABLE incident_report (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id             uuid NOT NULL REFERENCES tool(id) ON DELETE CASCADE,
    descricao_evento    text NOT NULL,
    causa               text,
    medida_correcao     text,
    identificado_em     timestamptz NOT NULL,
    comunicado_em       timestamptz,
    prazo_72h_cumprido  boolean,
    reportado_por_sub   text NOT NULL,
    criado_em           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_incident_tool ON incident_report (tool_id);
