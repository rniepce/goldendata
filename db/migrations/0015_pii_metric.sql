-- =============================================================================
-- goldendata — 0015 — Métrica de PII vazada (#48)
-- Adiciona o valor 'pii_vazada' ao enum metric_type: proporção de saídas que
-- vazam PII (CPF/processo CNJ/OAB/e-mail) ausente da referência — bloqueável no
-- gate. Aditivo (ADD VALUE não é usado na mesma transação).
-- =============================================================================

ALTER TYPE metric_type ADD VALUE IF NOT EXISTS 'pii_vazada';
