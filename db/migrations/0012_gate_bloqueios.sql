-- =============================================================================
-- goldendata — 0012 — Bloqueios de conformidade no gate de promoção
-- Além dos thresholds de métricas, o gate passa a barrar (fail-closed) a promoção
-- por motivos de conformidade: usos vedados aplicáveis (CNJ 615 Art. 10) e
-- RIPD/AIA requerido e ausente (Art. 14 / LGPD Art. 38). Os bloqueios apurados na
-- avaliação do gate ficam persistidos junto da decisão, como evidência.
-- =============================================================================

ALTER TABLE promotion_gate
    ADD COLUMN bloqueios jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN promotion_gate.bloqueios IS
    'Bloqueios de conformidade apurados (vedações Art. 10, RIPD/AIA ausente) — fail-closed.';
