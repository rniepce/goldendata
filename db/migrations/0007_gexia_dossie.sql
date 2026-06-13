-- =============================================================================
-- goldendata — 0007 — Dossiê de Governança GEX-IA (CNJ 615/2025)
-- Estende `tool` com os campos do inventário de soluções do GEX-IA/CIAR, que a
-- categorização binária (alto/baixo) não comporta. Mantém `categoria_risco`
-- (alto/baixo) como classificação derivada e adiciona a taxonomia CNJ granular
-- (BR1..BR8 / AR1..AR5 / a_confirmar) preservada na íntegra, além do trâmite de
-- triagem (processo SEI, estágio, fase F5/F6, riscos, próximos passos).
-- Aditivo e idempotente: todos os campos são NULL-áveis; não altera dados.
-- =============================================================================

ALTER TABLE tool
    ADD COLUMN IF NOT EXISTS categoria_risco_cnj       text,   -- taxonomia CNJ 615 granular (ex.: "BR1, BR4, BR5, BR7")
    ADD COLUMN IF NOT EXISTS processo_sei              text,   -- nº do processo SEI / link
    ADD COLUMN IF NOT EXISTS estagio_gexia             text,   -- estágio detalhado do dossiê (texto original)
    ADD COLUMN IF NOT EXISTS fase_gexia                text,   -- fase de análise (F5/F6)
    ADD COLUMN IF NOT EXISTS desenvolvimento           text,   -- Interno / Externo / Ambos
    ADD COLUMN IF NOT EXISTS instituicao_parceira      text,   -- parceira de desenvolvimento / fornecedor
    ADD COLUMN IF NOT EXISTS interfaces_institucionais text,   -- áreas acionadas (CEGINP/CEPROC/CESEC...)
    ADD COLUMN IF NOT EXISTS riscos_identificados      jsonb NOT NULL DEFAULT '[]'::jsonb,  -- lista de riscos
    ADD COLUMN IF NOT EXISTS proximos_passos           text,   -- próximos passos do dossiê
    ADD COLUMN IF NOT EXISTS status_governanca         text,   -- status do dossiê (Concluído, Pendente...)
    ADD COLUMN IF NOT EXISTS analista_responsavel      text,   -- analista do GEX-IA
    ADD COLUMN IF NOT EXISTS documento_origem          text,   -- documento/manifestação de origem
    ADD COLUMN IF NOT EXISTS data_analise              date,   -- data da análise
    ADD COLUMN IF NOT EXISTS observacoes               text,   -- observações do dossiê
    ADD COLUMN IF NOT EXISTS origem_registro           text;   -- proveniência do registro (ex.: "import_gexia_notion")

COMMENT ON COLUMN tool.categoria_risco_cnj IS 'Categoria de risco CNJ 615 granular (BR1..BR8/AR1..AR5/a_confirmar); categoria_risco guarda a derivação alto/baixo.';
COMMENT ON COLUMN tool.origem_registro IS 'Proveniência do registro para rastreabilidade (cadastro manual, import GEX-IA/Notion, etc.).';

CREATE INDEX IF NOT EXISTS idx_tool_categoria_cnj ON tool (categoria_risco_cnj);
CREATE INDEX IF NOT EXISTS idx_tool_estagio_gexia ON tool (estagio_gexia);
