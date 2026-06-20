-- =============================================================================
-- goldendata — 0013 — Balcão de demandas (#37) e Encaminhamentos (#42)
-- demanda: porta de entrada formal das unidades antes do portfólio (triagem:
--   aceitar→vira iniciativa / recusar / devolver). encaminhamento: compromisso
--   com responsável e prazo, gerado por deliberações/reuniões.
-- Ambos auditados pela trigger audit_capture (0005).
-- =============================================================================

CREATE TYPE demanda_status AS ENUM ('nova', 'em_triagem', 'aceita', 'recusada', 'devolvida');

CREATE TABLE demanda (
    id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade_demandante              text NOT NULL,
    titulo                          text NOT NULL,
    problema                        text,            -- problema/necessidade relatada
    processo_sei                    text,
    classificacao_risco_preliminar  text,            -- palpite AR/BR ou alto/baixo (texto)
    status                          demanda_status NOT NULL DEFAULT 'nova',
    motivo                          text,            -- justificativa de recusa/devolução
    iniciativa_id                   uuid REFERENCES iniciativa(id) ON DELETE SET NULL,  -- quando aceita
    criado_por_sub                  text,
    criado_em                       timestamptz NOT NULL DEFAULT now(),
    atualizado_em                   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE demanda IS 'Demanda de solução de IA de uma unidade (intake/triagem do GEX-IA).';
CREATE INDEX idx_demanda_status ON demanda (status);

CREATE TYPE encaminhamento_status AS ENUM ('aberto', 'feito', 'cancelado');

CREATE TABLE encaminhamento (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao          text NOT NULL,
    responsavel_email  text,
    responsavel_nome   text,
    prazo              date,
    origem             text,           -- ex.: "Reunião 12/06", "Deliberação 003"
    iniciativa_id      uuid REFERENCES iniciativa(id) ON DELETE SET NULL,
    status             encaminhamento_status NOT NULL DEFAULT 'aberto',
    criado_por_sub     text,
    criado_em          timestamptz NOT NULL DEFAULT now(),
    atualizado_em      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE encaminhamento IS 'Compromisso com responsável e prazo (deliberação→ação).';
CREATE INDEX idx_encaminhamento_status      ON encaminhamento (status);
CREATE INDEX idx_encaminhamento_responsavel ON encaminhamento (responsavel_email);

-- Mantém atualizado_em em UPDATE (padrão iniciativa_touch / documento_touch).
CREATE OR REPLACE FUNCTION demanda_touch() RETURNS trigger AS $$
BEGIN NEW.atualizado_em := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_demanda_touch BEFORE UPDATE ON demanda
    FOR EACH ROW EXECUTE FUNCTION demanda_touch();
CREATE TRIGGER trg_encaminhamento_touch BEFORE UPDATE ON encaminhamento
    FOR EACH ROW EXECUTE FUNCTION demanda_touch();

-- Auditoria encadeada.
CREATE TRIGGER trg_audit_demanda AFTER INSERT OR UPDATE OR DELETE ON demanda
    FOR EACH ROW EXECUTE FUNCTION audit_capture();
CREATE TRIGGER trg_audit_encaminhamento AFTER INSERT OR UPDATE OR DELETE ON encaminhamento
    FOR EACH ROW EXECUTE FUNCTION audit_capture();
