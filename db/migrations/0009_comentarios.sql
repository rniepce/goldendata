-- =============================================================================
-- goldendata — 0009 — Comentários/discussão e anexos (links) por iniciativa
-- Traz a "deliberação do comitê" para junto do próprio item, em vez de e-mails
-- paralelos (funcionalidade que o GEX-IA usava no Notion). Um comentário pode
-- conter texto e/ou um anexo-referência (URL do SEI, parecer, documento) — sem
-- armazenar arquivos (segurança/LGPD; o documental sensível fica no SEI).
-- O campo `resolvido` permite encerrar formalmente um ponto de discussão.
-- =============================================================================

CREATE TABLE comentario (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    iniciativa_id   uuid NOT NULL REFERENCES iniciativa(id) ON DELETE CASCADE,
    autor_sub       text NOT NULL,
    autor_nome      text,
    texto           text NOT NULL,
    anexo_url       text,        -- link de referência (SEI, documento) — opcional
    anexo_titulo    text,
    resolvido       boolean NOT NULL DEFAULT false,
    criado_em       timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE comentario IS 'Discussão/anexos-link por iniciativa do GEX-IA (deliberação ao lado do item).';
CREATE INDEX idx_comentario_iniciativa ON comentario (iniciativa_id, criado_em);
