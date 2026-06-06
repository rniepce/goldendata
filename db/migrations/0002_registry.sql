-- =============================================================================
-- goldendata — 0002 — Registro de Modelos e Ficha Técnica (necessidade 3.2)
-- Cada ferramenta/agente é versionado; a ficha técnica é a visão consolidada.
-- Referências: CNJ 615/2025 (Art. 9-14, 26-31), LGPD, Google Model Cards,
-- EU AI Act Anexo IV, MLflow registry/lineage.
-- =============================================================================

-- Modelo-base (provedor + versão) usado por uma ou mais ferramentas/versões.
CREATE TABLE model_base (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provedor        text        NOT NULL,                 -- ex.: OpenAI, Anthropic, Google, modelo_interno
    nome            text        NOT NULL,                 -- ex.: gpt-4o, claude-opus-4, llama-3-70b
    versao          text        NOT NULL,                 -- versão/snapshot do modelo
    hospedagem      model_hosting NOT NULL,
    notas_conformidade text,                              -- CNJ 615 Art. 28 §3º (nuvem/provedor)
    criado_em       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provedor, nome, versao)
);
COMMENT ON TABLE model_base IS 'Modelo de IA base (provedor/nome/versão) — campo "modelo e versão" da ficha técnica (3.2).';

-- Ferramenta OU agente de IA institucional (a entidade catalogada).
CREATE TABLE tool (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_institucional        text        NOT NULL UNIQUE,            -- código único interno do TJMG
    nome                        text        NOT NULL,
    tipo                        tool_type   NOT NULL,
    descricao                   text,
    unidade_responsavel         text        NOT NULL,                  -- unidade gestora
    owner_sub                   text        NOT NULL,                  -- subject Keycloak do responsável
    categoria_risco             risk_category,                         -- CNJ 615 Art. 9-11
    justificativa_risco         text,
    vedacoes_checklist          jsonb       NOT NULL DEFAULT '{}'::jsonb,  -- CNJ 615 Art. 10 (usos vedados)
    grau_supervisao_humana      supervision_level NOT NULL DEFAULT 'humano_no_loop',
    revisao_humana_obrigatoria  boolean     NOT NULL DEFAULT true,     -- Art. 32/34
    explicacao_linguagem_simples text,                                 -- Art. 13 II/III, Art. 33
    sinapses_id                 text,                                  -- registro nacional (Art. 23-25)
    status_ciclo_vida           lifecycle_stage NOT NULL DEFAULT 'rascunho',
    entrou_producao_em          timestamptz,
    proxima_revisao_em          date,                                  -- revisão ≤ 12 meses (Art. 11 §2º, 25 §1º)
    criado_em                   timestamptz NOT NULL DEFAULT now(),
    atualizado_em               timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE tool IS 'Ferramenta ou agente de IA catalogado. Núcleo da ficha técnica (3.2).';
CREATE INDEX idx_tool_owner       ON tool (owner_sub);
CREATE INDEX idx_tool_unidade     ON tool (unidade_responsavel);
CREATE INDEX idx_tool_status      ON tool (status_ciclo_vida);
CREATE INDEX idx_tool_risco       ON tool (categoria_risco);
CREATE INDEX idx_tool_revisao     ON tool (proxima_revisao_em);

-- Versionamento de prompt (histórico de mudanças do prompt).
CREATE TABLE prompt_version (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id         uuid        NOT NULL REFERENCES tool(id) ON DELETE CASCADE,
    versao          text        NOT NULL,                 -- semver/tag, ex.: 1.0.0
    conteudo        text        NOT NULL,                 -- system/instructions
    parent_version  uuid        REFERENCES prompt_version(id),
    changelog       text,
    autor_sub       text        NOT NULL,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tool_id, versao)
);
COMMENT ON TABLE prompt_version IS 'Versões de prompt — "histórico de mudanças" exigido pela ficha técnica (3.2).';
CREATE INDEX idx_prompt_version_tool ON prompt_version (tool_id);

-- Versão da ferramenta/agente — ponto onde a avaliação (3.3) se anexa e o gate decide.
CREATE TABLE tool_version (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id             uuid        NOT NULL REFERENCES tool(id) ON DELETE CASCADE,
    versao              text        NOT NULL,             -- semver/tag da versão da ferramenta
    model_base_id       uuid        NOT NULL REFERENCES model_base(id),
    prompt_version_id   uuid        REFERENCES prompt_version(id),
    config              jsonb       NOT NULL DEFAULT '{}'::jsonb,  -- temperature, top_p, max_tokens, tools...
    git_commit          text,
    changelog           text,
    lifecycle_stage     lifecycle_stage NOT NULL DEFAULT 'rascunho',
    promovido_em        timestamptz,
    promovido_por_sub   text,
    criado_por_sub      text        NOT NULL,
    criado_em           timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tool_id, versao)
);
COMMENT ON TABLE tool_version IS 'Versão imutável de ferramenta/agente (modelo+prompt+config) avaliada e promovida pelo gate.';
CREATE INDEX idx_tool_version_tool   ON tool_version (tool_id);
CREATE INDEX idx_tool_version_stage  ON tool_version (lifecycle_stage);

-- Campos exclusivos de AGENTE (1:1 com tool quando tipo='agente').
CREATE TABLE agent_spec (
    tool_id                 uuid PRIMARY KEY REFERENCES tool(id) ON DELETE CASCADE,
    nivel_autonomia         text,                          -- ex.: assistido, semi_autonomo, autonomo
    tools_permissoes        jsonb NOT NULL DEFAULT '[]'::jsonb,  -- least-privilege: [{tool, escopo, taxa, aprovacao}]
    guardrails              jsonb NOT NULL DEFAULT '[]'::jsonb,
    gatilhos_human_in_loop  jsonb NOT NULL DEFAULT '[]'::jsonb,
    kill_switch             boolean NOT NULL DEFAULT true,
    observacoes             text
);
COMMENT ON TABLE agent_spec IS 'Atributos próprios de agentes (autonomia, ferramentas/permissões, guardrails, kill switch).';

-- Inventário de dados utilizados — bloco "Dados utilizados"/LGPD da ficha (Art. 13, LGPD Art. 37 ROPA).
CREATE TABLE data_inventory (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id                     uuid NOT NULL REFERENCES tool(id) ON DELETE CASCADE,
    natureza                    data_nature NOT NULL,
    origem                      text NOT NULL,            -- proveniência da fonte
    categorias_dados            jsonb NOT NULL DEFAULT '[]'::jsonb,
    contem_dados_pessoais       boolean NOT NULL DEFAULT false,
    contem_dados_sensiveis      boolean NOT NULL DEFAULT false,   -- LGPD Art. 9º
    contem_dados_criancas       boolean NOT NULL DEFAULT false,   -- LGPD Art. 14
    contem_sigilo               boolean NOT NULL DEFAULT false,   -- segredo de justiça
    base_legal                  base_legal NOT NULL,
    tecnicas_protecao           jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {anonimizacao, pseudonimizacao, mascaramento[]}
    retencao_criterio           text,
    descarte_programado_em      date,
    finalidade_exclusiva_jurisdicional boolean NOT NULL DEFAULT false,  -- LGPD Art. 4º II
    ripd_requerido              boolean NOT NULL DEFAULT false,   -- LGPD Art. 38
    criado_em                   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE data_inventory IS 'Operações de tratamento de dados por ferramenta (ROPA/LGPD + dados utilizados da ficha técnica).';
CREATE INDEX idx_data_inventory_tool ON data_inventory (tool_id);

-- Registro de riscos por ferramenta/versão (CNJ 615 Art. 8º viés; NIST GenAI Profile).
CREATE TABLE risk_register (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id             uuid NOT NULL REFERENCES tool(id) ON DELETE CASCADE,
    tool_version_id     uuid REFERENCES tool_version(id) ON DELETE CASCADE,
    categoria           risk_kind NOT NULL,
    descricao           text NOT NULL,
    probabilidade       smallint CHECK (probabilidade BETWEEN 1 AND 5),
    impacto             smallint CHECK (impacto BETWEEN 1 AND 5),
    tratamento          text,
    risco_residual      smallint CHECK (risco_residual BETWEEN 1 AND 5),
    reavaliar_em        date,
    criado_em           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_risk_register_tool ON risk_register (tool_id);

-- Documentação anexa (model card, datasheet, RIPD, AIA, relatórios, pareceres).
CREATE TABLE attachment (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id         uuid REFERENCES tool(id) ON DELETE CASCADE,
    tool_version_id uuid REFERENCES tool_version(id) ON DELETE CASCADE,
    tipo            attachment_type NOT NULL,
    titulo          text NOT NULL,
    storage_key     text NOT NULL,                       -- chave no object storage (abstração 12-factor)
    sha256          text NOT NULL,                       -- integridade
    criado_por_sub  text NOT NULL,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    CHECK (tool_id IS NOT NULL OR tool_version_id IS NOT NULL)
);
CREATE INDEX idx_attachment_tool ON attachment (tool_id);
