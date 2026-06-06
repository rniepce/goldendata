# Modelo de Dados

Esquema PostgreSQL versionado em [`db/migrations`](../db/migrations). Tipos enumerados em `0001`; registro (3.2) em `0002`; avaliação (3.3) em `0003`; governança/auditoria em `0004`; triggers de auditoria/imutabilidade em `0005`.

## Registro / Ficha Técnica (3.2)

- **`model_base`** — modelo de IA base (provedor, nome, versão, hospedagem). Reutilizável por várias versões.
- **`tool`** — ferramenta **ou** agente catalogado: risco (Art. 9–11), vedações (Art. 10), supervisão humana, `sinapses_id`, ciclo de vida, próxima revisão (≤12 meses).
- **`prompt_version`** — versionamento de prompt (conteúdo, `parent_version`, changelog, autor).
- **`tool_version`** — versão imutável (modelo + prompt + config); `lifecycle_stage` controla o gate. **Ponto de ancoragem da avaliação.**
- **`agent_spec`** — atributos exclusivos de agente (autonomia, tools/permissões least-privilege, guardrails, kill switch).
- **`data_inventory`** — operações de tratamento (ROPA/LGPD): natureza, origem, categorias, flags de dados pessoais/sensíveis/sigilo, base legal, técnicas de proteção, retenção, RIPD.
- **`risk_register`** — riscos (alucinação, viés, vazamento…) com probabilidade/impacto/tratamento.
- **`attachment`** — documentação anexa (model card, datasheet, RIPD, AIA, pareceres) com hash de integridade.

## Avaliação / Golden Datasets (3.3)

- **`rubric`** — rubrica versionada (dimensões/escala). Gravada por resultado para preservar comparabilidade histórica.
- **`golden_dataset` / `golden_case`** — conjunto de referência versionado e seus casos (input + saída de referência + citações canônicas + flag PII).
- **`eval_run`** — execução de uma `tool_version` sobre um `golden_dataset` (store-only); `baseline_run_id` para regressão.
- **`eval_output`** — saída gerada **importada** por caso (a plataforma não chama o modelo).
- **`eval_result`** — score por caso por avaliador (determinístico/estatístico/humano/…).
- **`citation_check`** — verificação determinística de citações (detecção de alucinação).
- **`human_annotation`** — aceite/correção/rejeição + `edit_distance`/`similarity` + marcação de alucinação.
- **`production_event`** — captura de produção (Fase 2, via SDK/telemetria).
- **`inter_annotator_agreement`** — concordância κ/α por lote.
- **`regression_report`** — deltas vs. baseline e veredito.
- **`promotion_gate`** — thresholds × métricas, decisão humana, promoção.
- **`kpi_quality`** — rollup de indicadores (taxa de aceitação/correção/alucinação, edit-distance médio).
- **`incident_report`** — evento adverso com SLA de 72h.

## Governança / Auditoria (transversal)

- **`app_user`** — espelho local do usuário Keycloak (FK do RBAC).
- **`role_assignment`** — RBAC com escopo por ferramenta e **delegação com vigência**.
- **`audit_log`** — trilha **append-only**, encadeada por **hash SHA-256** (`prev_hash`/`hash`). Triggers `BEFORE UPDATE/DELETE` impedem alteração; trigger `AFTER` em cada tabela sensível registra quem/quando/o quê/onde/como (variáveis de sessão `goldendata.current_*`).

## Relações-chave

```
model_base ──< tool_version >── prompt_version
tool ──< tool_version ──< eval_run >── golden_dataset ──< golden_case
eval_run ──< eval_output ──< eval_result / citation_check / human_annotation
tool_version ──< promotion_gate ── eval_run
tool ──< data_inventory / risk_register / attachment / kpi_quality
app_user ──< role_assignment >── tool
(todas as tabelas sensíveis) ──> audit_log (append-only, encadeado)
```

Versionamento é de primeira classe (modelo, prompt, ferramenta, golden dataset e rubrica), com lineage e trilha de auditoria imutável — atendendo ao "histórico de mudanças" da ficha técnica e à base de auditoria do CNJ 615/LGPD.
