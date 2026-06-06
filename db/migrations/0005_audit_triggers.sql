-- =============================================================================
-- goldendata — 0005 — Imutabilidade da auditoria + triggers de auditoria
-- Garante (1) que audit_log não pode ser alterado/apagado e (2) que mudanças
-- nas tabelas de domínio geram registro encadeado por hash.
-- =============================================================================

-- (1) Imutabilidade: bloquear UPDATE/DELETE em audit_log.
CREATE OR REPLACE FUNCTION audit_log_block_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_log é append-only: % proibido', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_no_update
    BEFORE UPDATE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_block_mutation();

CREATE TRIGGER trg_audit_log_no_delete
    BEFORE DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_block_mutation();

-- Ator corrente: a aplicação seta `SET LOCAL goldendata.current_user_sub = '<sub>'`
-- (e opcionalmente ip/user_agent) por transação. Sem isso, registra 'sistema'.
CREATE OR REPLACE FUNCTION audit_actor() RETURNS text AS $$
BEGIN
    RETURN coalesce(nullif(current_setting('goldendata.current_user_sub', true), ''), 'sistema');
END;
$$ LANGUAGE plpgsql STABLE;

-- (2) Trigger genérico de auditoria com encadeamento de hash.
CREATE OR REPLACE FUNCTION audit_capture() RETURNS trigger AS $$
DECLARE
    v_prev   text;
    v_acao   audit_action;
    v_antes  jsonb;
    v_depois jsonb;
    v_entid  text;
    v_payload text;
    v_hash   text;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_acao := 'create'; v_antes := NULL; v_depois := to_jsonb(NEW);
        v_entid := (to_jsonb(NEW)->>'id');
    ELSIF TG_OP = 'UPDATE' THEN
        v_acao := 'update'; v_antes := to_jsonb(OLD); v_depois := to_jsonb(NEW);
        v_entid := (to_jsonb(NEW)->>'id');
    ELSE
        v_acao := 'delete'; v_antes := to_jsonb(OLD); v_depois := NULL;
        v_entid := (to_jsonb(OLD)->>'id');
    END IF;

    SELECT hash INTO v_prev FROM audit_log ORDER BY id DESC LIMIT 1;

    v_payload := coalesce(v_prev,'') || TG_TABLE_NAME || v_acao::text || coalesce(v_entid,'')
                 || coalesce(v_antes::text,'') || coalesce(v_depois::text,'') || now()::text;
    v_hash := encode(digest(v_payload, 'sha256'), 'hex');

    INSERT INTO audit_log (ts, ator_sub, acao, entidade, entidade_id, antes, depois,
                           ip_origem, user_agent, prev_hash, hash)
    VALUES (
        now(), audit_actor(), v_acao, TG_TABLE_NAME, v_entid, v_antes, v_depois,
        nullif(current_setting('goldendata.current_ip', true), '')::inet,
        nullif(current_setting('goldendata.current_user_agent', true), ''),
        v_prev, v_hash
    );

    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

-- Anexa auditoria às tabelas com relevância de conformidade.
CREATE TRIGGER trg_audit_tool            AFTER INSERT OR UPDATE OR DELETE ON tool            FOR EACH ROW EXECUTE FUNCTION audit_capture();
CREATE TRIGGER trg_audit_tool_version    AFTER INSERT OR UPDATE OR DELETE ON tool_version    FOR EACH ROW EXECUTE FUNCTION audit_capture();
CREATE TRIGGER trg_audit_prompt_version  AFTER INSERT OR UPDATE OR DELETE ON prompt_version  FOR EACH ROW EXECUTE FUNCTION audit_capture();
CREATE TRIGGER trg_audit_data_inventory  AFTER INSERT OR UPDATE OR DELETE ON data_inventory  FOR EACH ROW EXECUTE FUNCTION audit_capture();
CREATE TRIGGER trg_audit_promotion_gate  AFTER INSERT OR UPDATE OR DELETE ON promotion_gate  FOR EACH ROW EXECUTE FUNCTION audit_capture();
CREATE TRIGGER trg_audit_human_annotation AFTER INSERT OR UPDATE OR DELETE ON human_annotation FOR EACH ROW EXECUTE FUNCTION audit_capture();
CREATE TRIGGER trg_audit_role_assignment AFTER INSERT OR UPDATE OR DELETE ON role_assignment FOR EACH ROW EXECUTE FUNCTION audit_capture();
CREATE TRIGGER trg_audit_incident_report AFTER INSERT OR UPDATE OR DELETE ON incident_report FOR EACH ROW EXECUTE FUNCTION audit_capture();
