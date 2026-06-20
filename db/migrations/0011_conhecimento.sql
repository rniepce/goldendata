-- =============================================================================
-- goldendata — 0011 — Base de conhecimento (skills/diretrizes institucionais)
-- Corpus de documentos (.md/.txt) do GEX-IA que alimenta o RAG. Retrieval léxico
-- via full-text 'portuguese' (to_tsvector/websearch_to_tsquery + ts_rank_cd) com
-- reforço pg_trgm. Cada documento é fatiado em `documento_chunk`; o assistente
-- cita o documento de origem. Sem pgvector (Postgres puro / portável on-prem —
-- diretriz COARF); o upgrade para retrieval vetorial é evolução futura.
-- =============================================================================

CREATE TYPE documento_tipo AS ENUM (
    'skill',            -- instrução/skill operacional do GEX-IA
    'norma',            -- norma/resolução (CNJ 615, atos internos)
    'diretriz',         -- diretriz/política interna
    'modelo_resposta',  -- modelo/minuta de resposta a processo
    'outro'
);

CREATE TABLE documento (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo          text NOT NULL,
    tipo            documento_tipo NOT NULL DEFAULT 'skill',
    conteudo        text NOT NULL,                  -- markdown/texto-base curado
    fonte           text,                           -- origem (URL/processo SEI/arquivo)
    tags            text[] NOT NULL DEFAULT '{}',
    ativo           boolean NOT NULL DEFAULT true,   -- inativo = fora do RAG
    criado_por_sub  text,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    atualizado_em   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE documento IS 'Documento institucional do GEX-IA (corpus do RAG).';
CREATE INDEX idx_documento_tipo  ON documento (tipo);
CREATE INDEX idx_documento_ativo ON documento (ativo);

-- Mantém atualizado_em em UPDATE (padrão iniciativa_touch).
CREATE OR REPLACE FUNCTION documento_touch() RETURNS trigger AS $$
BEGIN
    NEW.atualizado_em := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_documento_touch BEFORE UPDATE ON documento
    FOR EACH ROW EXECUTE FUNCTION documento_touch();

-- Auditoria: criação/edição/remoção de documento entra na trilha encadeada (0005).
CREATE TRIGGER trg_audit_documento AFTER INSERT OR UPDATE OR DELETE ON documento
    FOR EACH ROW EXECUTE FUNCTION audit_capture();

-- Fatias indexadas (unidade de retrieval). Regeradas a cada reindexação do
-- documento — não auditadas (derivadas do conteúdo, que é auditado).
CREATE TABLE documento_chunk (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id  uuid NOT NULL REFERENCES documento(id) ON DELETE CASCADE,
    ordem         int NOT NULL,
    texto         text NOT NULL,
    tsv           tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', texto)) STORED,
    criado_em     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE documento_chunk IS 'Fatia indexada de um documento (unidade de retrieval do RAG).';
CREATE INDEX idx_doc_chunk_doc  ON documento_chunk (documento_id);
CREATE INDEX idx_doc_chunk_tsv  ON documento_chunk USING gin (tsv);
CREATE INDEX idx_doc_chunk_trgm ON documento_chunk USING gin (texto gin_trgm_ops);
