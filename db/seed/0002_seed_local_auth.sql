-- =============================================================================
-- goldendata — seed do modo de autenticação LOCAL (demonstração).
-- Senhas demo (≥15 caracteres — CESEC sem MFA). TROCAR em qualquer ambiente real:
--   coordenador@tjmg.jus.br : coordenador-goldendata-2026
--   owner@tjmg.jus.br       : owner-goldendata-2026
--   avaliador@tjmg.jus.br   : avaliador-goldendata-2026
--   dpo@tjmg.jus.br         : dpo-goldendata-2026
--   admin@tjmg.jus.br       : admin-goldendata-2026
-- Idempotente: pode ser reaplicado sem duplicar nada.
-- =============================================================================

UPDATE app_user SET password_hash = 'pbkdf2_sha256$600000$EwrSS+wyOD/Mkm7Qouv0Fg==$KG1DsQibb1ll2HwsEhYiclQAk2MvAGMHWAHoulwODuc=', senha_atualizada_em = now()
 WHERE email = 'coordenador@tjmg.jus.br';
UPDATE app_user SET password_hash = 'pbkdf2_sha256$600000$vFjPl3TWjo//615alF9h9w==$j006pQ1jxbedKmdobKqWFak5r2Hrj+c+NWNTG7Q8yLA=', senha_atualizada_em = now()
 WHERE email = 'owner@tjmg.jus.br';
UPDATE app_user SET password_hash = 'pbkdf2_sha256$600000$5wB1TlDpPI2ON8yb9RxKow==$VsyABk5TcVHpxDq9I+fTScxx/lItOojikpgZ3Vmbpqk=', senha_atualizada_em = now()
 WHERE email = 'avaliador@tjmg.jus.br';
UPDATE app_user SET password_hash = 'pbkdf2_sha256$600000$NgsTN8ix8pDJjuoPV3VLNg==$hE7HpL7UrR07icw7EVow9b0pF0rYg7Idm/gYQV1Eq0I=', senha_atualizada_em = now()
 WHERE email = 'dpo@tjmg.jus.br';
UPDATE app_user SET password_hash = 'pbkdf2_sha256$600000$90XwJTsRmQi5PZpl4ZsCMQ==$rlzJTwwtkVbf7WrbxYuw6oBpOYS9TgCrR6h/wdGyhPg=', senha_atualizada_em = now()
 WHERE email = 'admin@tjmg.jus.br';

-- Papéis globais (RBAC) — no modo local as roles vêm de role_assignment.
INSERT INTO role_assignment (user_sub, role)
SELECT u.sub, v.role::rbac_role
FROM (VALUES
    ('coordenador@tjmg.jus.br', 'coordenador_comite'),
    ('owner@tjmg.jus.br',       'owner_ferramenta'),
    ('avaliador@tjmg.jus.br',   'avaliador'),
    ('dpo@tjmg.jus.br',         'auditor_dpo'),
    ('admin@tjmg.jus.br',       'admin')
) AS v(email, role)
JOIN app_user u ON u.email = v.email
WHERE NOT EXISTS (
    SELECT 1 FROM role_assignment ra
    WHERE ra.user_sub = u.sub AND ra.role = v.role::rbac_role AND ra.tool_id IS NULL
);
