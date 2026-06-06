-- =============================================================================
-- goldendata — 0004 — Governança (RBAC + delegação) e trilha de auditoria
-- CESEC §2.4 (RBAC, privilégio mínimo, segregação de funções, delegação com
-- vigência) e §3 (trilha quem/quando/o quê/onde/como, integridade, retenção).
-- =============================================================================

-- Espelho local mínimo do usuário Keycloak (para FK/relatórios; fonte = Keycloak).
CREATE TABLE app_user (
    sub             text PRIMARY KEY,                  -- subject OIDC (Keycloak)
    nome            text NOT NULL,
    email           text,
    unidade         text,
    ativo           boolean NOT NULL DEFAULT true,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    visto_em        timestamptz
);

-- Atribuição de papéis (RBAC), com escopo opcional por ferramenta e delegação.
CREATE TABLE role_assignment (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_sub            text NOT NULL REFERENCES app_user(sub) ON DELETE CASCADE,
    role                rbac_role NOT NULL,
    tool_id             uuid REFERENCES tool(id) ON DELETE CASCADE,  -- NULL = escopo global
    via_delegacao       boolean NOT NULL DEFAULT false,
    delegado_por_sub    text REFERENCES app_user(sub),
    vigencia_inicio     timestamptz NOT NULL DEFAULT now(),
    vigencia_fim        timestamptz,                                 -- NULL = sem expiração
    criado_em           timestamptz NOT NULL DEFAULT now(),
    CHECK (NOT via_delegacao OR delegado_por_sub IS NOT NULL)
);
CREATE INDEX idx_role_assignment_user ON role_assignment (user_sub);
CREATE INDEX idx_role_assignment_tool ON role_assignment (tool_id);
COMMENT ON TABLE role_assignment IS 'RBAC com escopo e delegação temporal (CESEC). Papéis também vêm dos roles do Keycloak.';

-- Trilha de auditoria imutável e encadeada (tamper-evident).
CREATE TABLE audit_log (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts              timestamptz NOT NULL DEFAULT now(),     -- HLB via NTP no servidor
    ator_sub        text,                                   -- QUEM
    acao            audit_action NOT NULL,                  -- O QUÊ
    entidade        text NOT NULL,
    entidade_id     text,
    antes           jsonb,
    depois          jsonb,
    ip_origem       inet,                                   -- ONDE (X-Forwarded-For/RFC 7239)
    user_agent      text,                                   -- COMO
    metodo_auth     text,
    prev_hash       text,                                   -- encadeamento de integridade
    hash            text NOT NULL                           -- sha256(prev_hash || conteúdo)
);
CREATE INDEX idx_audit_log_entidade ON audit_log (entidade, entidade_id);
CREATE INDEX idx_audit_log_ator     ON audit_log (ator_sub);
CREATE INDEX idx_audit_log_ts       ON audit_log (ts);
COMMENT ON TABLE audit_log IS 'Trilha append-only, encadeada por hash. Retenção mínima 6 meses (CESEC §3).';
