# Matriz de Conformidade — Resolução CNJ nº 615/2025 e LGPD

Como a plataforma **goldendata** evidencia, por construção, os requisitos da Resolução CNJ nº 615/2025 (uso de IA no Poder Judiciário) e da LGPD. Cada linha aponta o campo/entidade/funcionalidade que serve de prova de conformidade na auditoria do comitê de IA.

> **Atenção:** a numeração de artigos abaixo reflete a leitura do texto oficial ([atos.cnj.jus.br/atos/detalhar/6001](https://atos.cnj.jus.br/atos/detalhar/6001)) e deve ser **conferida na redação literal** antes de uso oficial. Itens marcados *(confirmar)* têm incerteza de dispositivo.

## 1. Resolução CNJ nº 615/2025

| Requisito | Dispositivo | Evidência na plataforma |
|---|---|---|
| Classificação de risco da solução (alto/baixo) | Art. 9–11 | `tool.categoria_risco` + `tool.justificativa_risco`; filtros e travas por categoria |
| Usos vedados / risco excessivo (sem revisão humana, predição de reincidência, ranqueamento por comportamento, reconhecimento de emoções) | Art. 10 | `tool.vedacoes_checklist` (jsonb); o gate bloqueia promoção se finalidade casar com vedação |
| Avaliação de impacto algorítmico para alto risco | Art. 14 *(confirmar)* | `attachment` tipo `aia`; `data_inventory.ripd_requerido`; gate barra produção sem AIA |
| Cadastro/inventário no **Sinapses**, por categoria de risco | Art. 23–25 *(confirmar)* | `tool.sinapses_id`; exportação/integração Sinapses (Fase V1) |
| Documentação técnica obrigatória da solução | Art. 13 | Ficha técnica: `data_inventory`, `prompt_version`, `tool_version`, supervisão, `explicacao_linguagem_simples`, logs |
| Auditabilidade / logs automáticos | Art. 13, V | `audit_log` (append-only, encadeado), `eval_run`/`eval_result` |
| Supervisão humana em todas as etapas (human-in-the-loop) | Art. 2º V; 32 | `tool.grau_supervisao_humana`; `human_annotation`; gate com aprovação humana |
| Revisão humana de minutas; uso auxiliar e complementar; magistrado pode modificar | Art. 19 §3º; 34 *(confirmar)* | `tool.revisao_humana_obrigatoria`; fila de anotação (aceite/correção/rejeição) |
| Explicabilidade e transparência (linguagem simples; aviso de uso de IA) | Art. 3º II; 13 VII; 33 | `tool.explicacao_linguagem_simples`; aviso de IA no front-end |
| Testes/homologação e **gate de produção** por critérios objetivos | Art. 9º §1º | `promotion_gate` (thresholds × métricas) + `regression_report`; `lifecycle_stage` só avança no gate |
| Monitoramento e auditoria contínuos ao longo do ciclo de vida | Art. 5º §2º; 11 §1º | `kpi_quality` (taxas de aceitação/correção/alucinação); dashboards; `eval_run` recorrente |
| Não discriminação e mitigação de viés | Art. 8º | `risk_register` (categoria `vies`); ação: suspender/corrigir/descontinuar |
| Comunicação de incidentes/eventos adversos em 72h | Art. 42 §2º *(confirmar)* | `incident_report` (campos de causa/medida; flag `prazo_72h_cumprido`) |
| Revisão periódica das informações (≤ 12 meses) | Art. 11 §2º; 25 §1º *(confirmar)* | `tool.proxima_revisao_em`; lembrete automático |
| Designação de responsáveis / governança | Art. 6º; 12 | `tool.owner_sub`, `tool.unidade_responsavel`; RBAC (`role_assignment`) |
| Tratamento de dados pessoais conforme LGPD; anonimização; curadoria | Art. 7º; 26; 30–31 | `data_inventory` (base legal, técnicas de proteção, retenção); mascaramento de CPF |

## 2. LGPD (Lei nº 13.709/2018)

| Requisito | Dispositivo | Evidência na plataforma |
|---|---|---|
| Base legal do tratamento (função jurisdicional / obrigação legal / política pública / legítimo interesse) | Art. 4º II; 7º | `data_inventory.base_legal` (enum) por ferramenta |
| Princípios (finalidade, adequação, necessidade/minimização) | Art. 6º | `data_inventory.categorias_dados` + `finalidade_exclusiva_jurisdicional`; coleta mínima |
| Registro das operações de tratamento (ROPA) | Art. 37 | `data_inventory` (origem, categorias, retenção, técnicas) — um registro por operação |
| Relatório de Impacto (RIPD/DPIA) | Art. 5º XVII; 38 | `data_inventory.ripd_requerido`; `attachment` tipo `ripd` |
| Dados sensíveis e de crianças/adolescentes | Art. 9º; 14 | flags `contem_dados_sensiveis`, `contem_dados_criancas` |
| Anonimização / pseudonimização / mascaramento | Art. 5º III; 12 | `data_inventory.tecnicas_protecao`; `mask_cpf` (formato Pix `***.777.888-**`); flag `contem_pii` em golden cases |
| Retenção e eliminação | Art. 16 | `data_inventory.retencao_criterio`, `descarte_programado_em` |
| Segurança e prevenção | Art. 46–47 | TLS 1.3/HSTS/headers; RBAC; `audit_log`; segredos fora do código |
| Encarregado (DPO) | Art. 41 | papel RBAC `auditor_dpo` (acesso à auditoria e à verificação de integridade) |

## 3. Tratamento dos golden datasets e capturas de produção (LGPD aplicada)

- **Classificação de PII antes de persistir**: `golden_case.contem_pii` e flags de sigilo.
- **Minimização**: preferir entradas anonimizadas/pseudonimizadas; mascarar CPF (`mask_cpf`).
- **Segregação e acesso**: golden sets acessíveis apenas a papéis autorizados (RBAC); leitura de auditoria restrita a `auditor_dpo`/coordenador.
- **Retenção**: datasets de versões relevantes mantidos para reprodutibilidade da avaliação; descarte conforme política.
- **Segredo de justiça**: casos de processos em segredo exigem autorização; preferir dados sintéticos no golden set.

## 4. Lacunas conhecidas / próximos passos de conformidade

- Integração efetiva com o **Sinapses** (exportação do registro) — Fase V1.
- Verificação de citações contra **base canônica oficial** de jurisprudência/legislação — hoje determinística contra o gabarito; Fase V1.
- Workflow formal de **RIPD/AIA** com aprovação — Fase V1.
- **Calibração de LLM-as-judge** e detecção semântica de alucinação (NLI) on-prem — Fase V2.
- Confirmar a **numeração literal** dos artigos da 615/2025 e eventual consolidação por resoluções posteriores.
