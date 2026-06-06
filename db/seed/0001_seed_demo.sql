-- =============================================================================
-- goldendata — seed de demonstração (ambiente dev).
-- IDs fixos para facilitar a demonstração ponta a ponta. Os subs dos usuários
-- casam com os IDs definidos no realm do Keycloak (infra/keycloak/realm-tjmg.json).
-- =============================================================================

-- Usuários (espelho local do Keycloak) — um por papel.
INSERT INTO app_user (sub, nome, email, unidade) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Coordenador do Comitê de IA', 'coordenador@tjmg.jus.br', 'Comitê de IA'),
  ('22222222-2222-2222-2222-222222222222', 'Responsável da Ferramenta',   'owner@tjmg.jus.br',       '1ª Vara Cível'),
  ('33333333-3333-3333-3333-333333333333', 'Avaliador (servidor)',        'avaliador@tjmg.jus.br',   'Gabinete'),
  ('44444444-4444-4444-4444-444444444444', 'Auditor / DPO',               'dpo@tjmg.jus.br',         'Encarregadoria LGPD'),
  ('55555555-5555-5555-5555-555555555555', 'Administrador',               'admin@tjmg.jus.br',       'DIRTEC')
ON CONFLICT (sub) DO NOTHING;

-- Modelo-base (modelo interno hospedado on-premise).
INSERT INTO model_base (id, provedor, nome, versao, hospedagem, notas_conformidade) VALUES
  ('10000000-0000-0000-0000-000000000001', 'modelo_interno', 'tjmg-llm', '2025.1', 'on_premise',
   'Modelo hospedado em infraestrutura do TJMG; sem envio de dados a provedores externos.');

-- Ferramenta catalogada (geração de minutas de despacho).
INSERT INTO tool (id, codigo_institucional, nome, tipo, descricao, unidade_responsavel, owner_sub,
                  categoria_risco, justificativa_risco, vedacoes_checklist, grau_supervisao_humana,
                  revisao_humana_obrigatoria, explicacao_linguagem_simples, sinapses_id,
                  status_ciclo_vida, proxima_revisao_em)
VALUES (
  '20000000-0000-0000-0000-000000000001', 'IA-2025-001', 'Assistente de Minutas de Despacho', 'ferramenta',
  'Gera minutas de despacho de mero expediente a partir do contexto processual, para revisão humana.',
  '1ª Vara Cível', '22222222-2222-2222-2222-222222222222',
  'alto', 'Auxilia a elaboração de atos judiciais; minuta sempre revisada por servidor/magistrado.',
  '{"sem_revisao_humana": false, "predicao_reincidencia": false, "ranqueamento_comportamento": false, "reconhecimento_emocoes": false}'::jsonb,
  'humano_no_loop', true,
  'A ferramenta sugere uma minuta com base no processo; a decisão e a redação final são sempre do humano.',
  null, 'em_avaliacao', (CURRENT_DATE + INTERVAL '12 months')::date
);

-- Inventário de dados utilizados (bloco LGPD da ficha técnica).
INSERT INTO data_inventory (tool_id, natureza, origem, categorias_dados, contem_dados_pessoais,
       contem_dados_sensiveis, contem_sigilo, base_legal, tecnicas_protecao,
       retencao_criterio, finalidade_exclusiva_jurisdicional, ripd_requerido)
VALUES (
  '20000000-0000-0000-0000-000000000001', 'contexto_runtime', 'Autos do processo (PJe)',
  '["partes", "numero_processo", "movimentacoes"]'::jsonb, true, false, true, 'funcao_jurisdicional',
  '{"mascaramento": ["cpf"], "anonimizacao": false}'::jsonb,
  'Enquanto durar o interesse processual', true, false
);

-- Versão de prompt v1.
INSERT INTO prompt_version (id, tool_id, versao, conteudo, changelog, autor_sub) VALUES (
  '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '1.0.0',
  'Você é um assistente que redige minutas de despacho de mero expediente, em linguagem formal e impessoal, sem decidir o mérito.',
  'Versão inicial.', '22222222-2222-2222-2222-222222222222'
);

-- Versão da ferramenta v1 (modelo + prompt + config).
INSERT INTO tool_version (id, tool_id, versao, model_base_id, prompt_version_id, config,
                          changelog, lifecycle_stage, criado_por_sub) VALUES (
  '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '1.0.0',
  '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
  '{"temperature": 0.2, "max_tokens": 1024}'::jsonb, 'Versão inicial.', 'em_avaliacao',
  '22222222-2222-2222-2222-222222222222'
);

-- Golden dataset + casos de referência (gabaritos).
INSERT INTO golden_dataset (id, tool_id, nome, dominio, versao, origem_predominante, criado_por_sub) VALUES (
  '50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  'Despachos de expediente — referência v1', 'despacho', '1.0.0', 'sintetico',
  '22222222-2222-2222-2222-222222222222'
);

INSERT INTO golden_case (id, golden_dataset_id, input_prompt, contexto_grounding, saida_referencia,
                         criterios_aceitacao, dificuldade, categoria_risco, contem_pii, origem) VALUES
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
   'Intime-se a parte autora para emendar a inicial em 15 dias.',
   '{"citacoes_canonicas": []}'::jsonb,
   'Intime-se a parte autora para, no prazo de 15 (quinze) dias, emendar a petição inicial, sob pena de indeferimento.',
   'Conter prazo de 15 dias e a cominação.', 2, 'baixo', false, 'sintetico'),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001',
   'Conclusos para decisão sobre tutela de urgência.',
   '{"citacoes_canonicas": ["art. 300"]}'::jsonb,
   'Venham os autos conclusos para análise do pedido de tutela de urgência, nos termos do art. 300 do CPC.',
   'Mencionar art. 300 do CPC.', 3, 'baixo', false, 'sintetico');
