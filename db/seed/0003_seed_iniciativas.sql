-- =============================================================================
-- goldendata — seed 0003 — Iniciativas do GEX-IA
-- (1) Espelha as soluções de IA importadas (origem import_gexia_notion) como
--     iniciativas da categoria 'solucao_ia', com responsável/status derivados.
-- (2) Cria iniciativas de exemplo nas demais categorias para popular o painel.
-- Idempotente: não insere se já houver iniciativas (evita duplicar em re-seed).
-- =============================================================================

DO $$
BEGIN
IF (SELECT count(*) FROM iniciativa) > 0 THEN
    RAISE NOTICE 'iniciativas já existem — seed ignorado';
    RETURN;
END IF;

-- (1) Soluções de IA -> iniciativas -------------------------------------------
WITH membros(email, nome, apelido) AS (
    VALUES
      ('victor.leal@tjmg.jus.br',     'Victor Moreira Mulin Leal',     'victor'),
      ('gustavo.soares@tjmg.jus.br',  'Gustavo Resende Queiroz Soares','gustavo'),
      ('erika.porto@tjmg.jus.br',     'Érika Porto',                   'rika'),
      ('urick.teixeira@tjmg.jus.br',  'Urick Alberth',                 'urick'),
      ('isabella.andrade@tjmg.jus.br','Isabella Andrade',              'isabella'),
      ('rafael.pimentel@tjmg.jus.br', 'Rafael Niepce Verona Pimentel', 'rafael')
)
INSERT INTO iniciativa (titulo, resumo, categoria, status, prioridade,
                        responsavel_email, responsavel_nome, tool_id, processo_sei)
SELECT
    t.nome,
    left(coalesce(nullif(t.descricao, ''), t.observacoes, ''), 600),
    'solucao_ia',
    CASE
        WHEN t.estagio_gexia ILIKE 'suspenso%'        THEN 'em_pausa'
        WHEN t.estagio_gexia ILIKE 'backlog%'         THEN 'a_fazer'
        WHEN t.status_governanca ILIKE 'conclu%'      THEN 'concluido'
        ELSE 'em_andamento'
    END::iniciativa_status,
    CASE WHEN t.categoria_risco = 'alto' THEN 'alta' ELSE 'media' END::iniciativa_prioridade,
    coalesce(m.email, 'victor.leal@tjmg.jus.br'),
    coalesce(m.nome,  'Victor Moreira Mulin Leal'),
    t.id,
    t.processo_sei
FROM tool t
LEFT JOIN membros m ON t.analista_responsavel ILIKE '%' || m.apelido || '%'
WHERE t.origem_registro = 'import_gexia_notion';

-- (2) Iniciativas de exemplo nas demais categorias ----------------------------
INSERT INTO iniciativa (titulo, resumo, categoria, status, prioridade, responsavel_email, responsavel_nome) VALUES
('Trilha de formação em IA para magistrados e servidores',
 'Estruturação, com a EJEF, de uma trilha de capacitação sobre uso responsável de IA no Judiciário (fundamentos, LGPD, CNJ 615 e prática com as ferramentas institucionais).',
 'educacional', 'em_andamento', 'alta', 'isabella.andrade@tjmg.jus.br', 'Isabella Andrade'),

('Curso de uso responsável do Assistente TJMG',
 'Material e oficina de capacitação para magistrados e servidores no uso do Assistente TJMG (boas práticas, limites e revisão humana obrigatória).',
 'educacional', 'a_fazer', 'media', 'erika.porto@tjmg.jus.br', 'Érika Porto'),

('Atendimento às varas no uso do Degravador de Audiências',
 'Apoio técnico e funcional às unidades na adoção do Degravador de Audiências, incluindo orientação sobre revisão final obrigatória antes da juntada.',
 'suporte', 'em_andamento', 'media', 'urick.teixeira@tjmg.jus.br', 'Urick Alberth'),

('Canal de dúvidas sobre ferramentas de IA (GEX-IA)',
 'Canal centralizado para receber e responder dúvidas das áreas sobre as soluções de IA homologadas e em avaliação.',
 'suporte', 'em_andamento', 'baixa', 'erika.porto@tjmg.jus.br', 'Érika Porto'),

('Adequação das soluções à Resolução CNJ 615/2025',
 'Acompanhamento contínuo da conformidade das soluções de IA aos requisitos da Resolução CNJ 615/2025 e à LGPD (categorização de risco, vedações, revisão periódica).',
 'governanca_normativo', 'em_andamento', 'alta', 'gustavo.soares@tjmg.jus.br', 'Gustavo Resende Queiroz Soares'),

('Política de uso aceitável de IA generativa',
 'Elaboração de diretrizes institucionais de uso aceitável das ferramentas de IA generativa (Gemini, NotebookLM) disponibilizadas pelo Workspace.',
 'governanca_normativo', 'a_fazer', 'alta', 'rafael.pimentel@tjmg.jus.br', 'Rafael Niepce Verona Pimentel'),

('Cooperação técnica com o TJPA',
 'Articulação da cooperação com o TJPA para cessão de soluções de anonimização e degravação de audiências, com avaliação de sobreposição às soluções do TJMG.',
 'cooperacao', 'em_andamento', 'media', 'victor.leal@tjmg.jus.br', 'Victor Moreira Mulin Leal'),

('Benchmarking de chatbots judiciais (Resolva Aqui — TJRR)',
 'Estudo comparativo de chatbots judiciais de referência, com foco no Resolva Aqui (TJRR), para subsidiar a evolução do TJMG Atende.',
 'pesquisa_prospeccao', 'em_andamento', 'media', 'victor.leal@tjmg.jus.br', 'Victor Moreira Mulin Leal'),

('Avaliação de LLMs on-premise para dados sigilosos',
 'Prospecção de modelos de linguagem hospedáveis on-premise para tratamento de dados sob sigilo, reduzindo dependência de provedores externos.',
 'pesquisa_prospeccao', 'a_fazer', 'media', 'urick.teixeira@tjmg.jus.br', 'Urick Alberth');

END $$;
