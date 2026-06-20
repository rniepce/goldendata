-- =============================================================================
-- goldendata — 0014 — Deliberações com voto nominal (#38)
-- Formaliza as decisões do colegiado: pauta + relator + voto nominal dos membros
-- (favorável/contrário/abstenção/impedido) + quórum + resultado. Um voto por
-- membro (UNIQUE). Auditado pela trigger audit_capture (0005).
-- =============================================================================

CREATE TYPE deliberacao_status AS ENUM ('aberta', 'encerrada');
CREATE TYPE voto_valor AS ENUM ('favoravel', 'contrario', 'abstencao', 'impedido');

CREATE TABLE deliberacao (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo          text NOT NULL,
    pauta           text,
    relator_email   text,
    iniciativa_id   uuid REFERENCES iniciativa(id) ON DELETE SET NULL,
    tool_id         uuid REFERENCES tool(id) ON DELETE SET NULL,
    status          deliberacao_status NOT NULL DEFAULT 'aberta',
    resultado       text,            -- desfecho lavrado ao encerrar
    criado_por_sub  text,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    atualizado_em   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE deliberacao IS 'Deliberação formal do GEX-IA com voto nominal.';
CREATE INDEX idx_deliberacao_status ON deliberacao (status);

CREATE TABLE voto (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deliberacao_id  uuid NOT NULL REFERENCES deliberacao(id) ON DELETE CASCADE,
    membro_email    text NOT NULL,
    membro_nome     text,
    valor           voto_valor NOT NULL,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (deliberacao_id, membro_email)    -- um voto por membro por deliberação
);

CREATE OR REPLACE FUNCTION deliberacao_touch() RETURNS trigger AS $$
BEGIN NEW.atualizado_em := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deliberacao_touch BEFORE UPDATE ON deliberacao
    FOR EACH ROW EXECUTE FUNCTION deliberacao_touch();

CREATE TRIGGER trg_audit_deliberacao AFTER INSERT OR UPDATE OR DELETE ON deliberacao
    FOR EACH ROW EXECUTE FUNCTION audit_capture();
CREATE TRIGGER trg_audit_voto AFTER INSERT OR UPDATE OR DELETE ON voto
    FOR EACH ROW EXECUTE FUNCTION audit_capture();
