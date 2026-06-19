-- =============================================================================
-- goldendata — 0008 — Iniciativas do GEX-IA (portfólio de trabalho do grupo)
-- Camada de gestão/portfólio: cada iniciativa tem categoria, responsável e status.
-- Quando a iniciativa é uma solução de IA, vincula-se à `tool` (ficha técnica).
-- Alimenta o Painel inicial (visões: por categoria e kanban por status).
-- =============================================================================

CREATE TYPE iniciativa_categoria AS ENUM (
    'solucao_ia',            -- desenvolver/avaliar/governar ferramentas de IA
    'educacional',           -- capacitação, cursos, trilhas de formação (EJEF)
    'suporte',               -- atendimento e apoio às áreas no uso de IA
    'governanca_normativo',  -- atos normativos, pareceres, conformidade CNJ 615/LGPD
    'cooperacao',            -- parcerias com outros tribunais/CNJ
    'pesquisa_prospeccao'    -- avaliação de novas tecnologias, benchmarking
);

CREATE TYPE iniciativa_status AS ENUM (
    'a_fazer', 'em_andamento', 'em_pausa', 'concluido', 'cancelado'
);

CREATE TYPE iniciativa_prioridade AS ENUM ('baixa', 'media', 'alta');

CREATE TABLE iniciativa (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo              text NOT NULL,
    resumo              text,                                   -- exibido no hover do card
    categoria           iniciativa_categoria NOT NULL,
    status              iniciativa_status NOT NULL DEFAULT 'em_andamento',
    prioridade          iniciativa_prioridade NOT NULL DEFAULT 'media',
    responsavel_email   text,                                  -- um dos membros do GEX-IA
    responsavel_nome    text,
    tool_id             uuid REFERENCES tool(id) ON DELETE SET NULL,  -- solução de IA vinculada
    processo_sei        text,
    prazo               date,
    criado_por_sub      text,
    criado_em           timestamptz NOT NULL DEFAULT now(),
    atualizado_em       timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE iniciativa IS 'Iniciativa/projeto do GEX-IA — unidade do Painel (portfólio de trabalho).';
CREATE INDEX idx_iniciativa_categoria   ON iniciativa (categoria);
CREATE INDEX idx_iniciativa_status      ON iniciativa (status);
CREATE INDEX idx_iniciativa_responsavel ON iniciativa (responsavel_email);
CREATE INDEX idx_iniciativa_tool        ON iniciativa (tool_id);

-- Mantém atualizado_em em UPDATE.
CREATE OR REPLACE FUNCTION iniciativa_touch() RETURNS trigger AS $$
BEGIN
    NEW.atualizado_em := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_iniciativa_touch BEFORE UPDATE ON iniciativa
    FOR EACH ROW EXECUTE FUNCTION iniciativa_touch();
