-- =============================================================================
-- goldendata — 0006 — Autenticação LOCAL (e-mail+senha) para o MVP
-- Aditiva e segura para bancos já implantados (Railway). O modo OIDC/Keycloak
-- permanece disponível via configuração (produção institucional — CESEC).
-- =============================================================================

-- Credencial local: hash PBKDF2-HMAC-SHA-256 (nunca senha em claro — CESEC §4.2).
ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS password_hash text,
    ADD COLUMN IF NOT EXISTS senha_atualizada_em timestamptz;

-- E-mail passa a ser o identificador de login no modo local.
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_user_email ON app_user (lower(email)) WHERE email IS NOT NULL;

-- Auditoria MANUAL com encadeamento de hash (mesma cadeia do trigger):
-- usada para eventos que não são mudança de tabela, ex.: login (sucesso/falha).
CREATE OR REPLACE FUNCTION audit_append(
    p_ator   text,
    p_acao   audit_action,
    p_entidade text,
    p_entidade_id text,
    p_detalhe jsonb DEFAULT NULL,
    p_ip inet DEFAULT NULL,
    p_user_agent text DEFAULT NULL
) RETURNS bigint AS $$
DECLARE
    v_prev text;
    v_payload text;
    v_hash text;
    v_id bigint;
BEGIN
    SELECT hash INTO v_prev FROM audit_log ORDER BY id DESC LIMIT 1;
    v_payload := coalesce(v_prev,'') || p_entidade || p_acao::text || coalesce(p_entidade_id,'')
                 || coalesce(p_detalhe::text,'') || now()::text;
    v_hash := encode(digest(v_payload, 'sha256'), 'hex');
    INSERT INTO audit_log (ts, ator_sub, acao, entidade, entidade_id, depois,
                           ip_origem, user_agent, prev_hash, hash)
    VALUES (now(), p_ator, p_acao, p_entidade, p_entidade_id, p_detalhe,
            p_ip, p_user_agent, v_prev, v_hash)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;
