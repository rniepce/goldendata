# goldendata — Governança e Qualidade de IA do TJMG

Plataforma institucional única do **comitê de IA do TJMG** que cobre duas necessidades:

- **3.2 — Registro de Modelos e Ficha Técnica das Ferramentas.** Catálogo único que documenta, para cada ferramenta/agente de IA, o modelo e a versão, os dados utilizados, os limites de uso, o responsável e o histórico de mudanças. Base de auditoria para a **Resolução CNJ nº 615/2025** e a **LGPD**.
- **3.3 — Avaliação Contínua de Qualidade (Human-in-the-Loop).** Indicadores de **taxa de aceitação** e **taxa de correção das minutas**, detecção de alucinação, e **testes de regressão sobre golden datasets** com **gate de promoção** antes de produção.

As duas se retroalimentam: o registro **versiona** ferramentas/agentes/prompts; a avaliação **testa cada versão**, decide o gate e gera os indicadores que voltam à ficha técnica e à auditoria.

## Arquitetura (conforme COARF/CESEC/Conod)

| Camada | Tecnologia |
|---|---|
| Front-end | React + TypeScript (Vite), tokens aproximando o Design System TJMG, acessível (WCAG) |
| Back-end | Python + FastAPI, REST, stateless, 12-factor |
| Banco | PostgreSQL (Supabase apenas como Postgres gerenciado no MVP; migrations versionadas) |
| Autenticação | Keycloak (OIDC/PKCE) + RBAC + MFA |
| Auditoria | `audit_log` append-only e encadeado por hash; horário HLB (NTP) |
| Containers | Docker / docker-compose (paridade dev/prod) |

Decisões do MVP: integração **manual** (cadastro/anotação no portal; SDK de telemetria na Fase 2); avaliação **store-only** (a plataforma não chama modelos — importa as saídas, calcula métricas e gere a anotação humana/gate); escopo = **fatia fina das duas necessidades** ponta a ponta.

## Estrutura

```
db/migrations/     Esquema PostgreSQL versionado (0001..0005) + seed de demonstração
backend/           FastAPI: core (auth/db/auditoria/mascaramento), domínios (registry/evaluation/governance), métricas
frontend/          React + TS (catálogo, ficha técnica, golden datasets, avaliação, anotação, gate, indicadores, auditoria, admin)
infra/keycloak/    Realm `tjmg` (papéis + clientes + usuários demo)
docs/              Matriz de conformidade CNJ 615/LGPD, modelo de dados, segurança CESEC
```

## Como rodar (desenvolvimento)

```bash
docker compose up --build
```

Sobe Postgres (com migrations + seed aplicados na inicialização), Keycloak (realm `tjmg` importado), back-end (`:8000`) e front-end (`:5173`).

- API/health: http://localhost:8000/health · OpenAPI: http://localhost:8000/docs
- Front-end: http://localhost:5173
- Keycloak (admin/admin): http://localhost:8080

### Usuários de demonstração (Keycloak realm `tjmg`)

| Usuário | Senha | Papel |
|---|---|---|
| `coordenador` | `coordenador` | coordenador_comite |
| `owner` | `owner` | owner_ferramenta |
| `avaliador` | `avaliador` | avaliador |
| `dpo` | `dpo` | auditor_dpo |
| `admin-app` | `admin-app` | admin |

## Fluxo de demonstração ponta a ponta

1. **owner** cadastra a ferramenta + ficha técnica (já vem um exemplo no seed: *Assistente de Minutas de Despacho*) e cria uma versão (modelo + prompt).
2. **owner** cria um golden dataset com casos (input + saída de referência).
3. **owner** cria uma execução de avaliação e **importa as saídas** geradas → a plataforma calcula `exact_match`, `edit_distance`, `similarity` e checa citações (detecção de alucinação determinística).
4. **avaliador** abre a fila e anota **aceite/correção/rejeição** (cola o texto corrigido → calcula a distância de edição) e marca alucinação.
5. **coordenador** configura os thresholds do **gate**, vê a decisão automática e **aprova/reprova** a promoção (versão abaixo do critério é bloqueada).
6. **coordenador/dpo** acompanham os **indicadores** e a **trilha de auditoria** (com verificação de integridade da cadeia de hashes).

## Testes e verificação

```bash
cd backend && python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
ruff check app && python -m pytest      # lint + testes de lógica pura (métricas, gate, mascaramento)
```

A verificação ponta a ponta (jornada acima, imutabilidade da auditoria, RBAC anti-IDOR) é descrita em [docs/conformidade-cnj615.md](docs/conformidade-cnj615.md) e no plano de implementação.

## Conformidade

- [Matriz CNJ 615/2025 + LGPD](docs/conformidade-cnj615.md)
- [Modelo de dados](docs/modelo-de-dados.md)
- [Segurança (CESEC)](docs/seguranca-cesec.md)
- [Deploy no Railway](docs/deploy-railway.md) (alternativa ao Supabase; hospeda toda a stack)

> Roadmap: **V1** — SDK/telemetria (captura automática de aceite/correção), verificação de citações contra base oficial, RIPD/AIA, export Sinapses, incidentes 72h, K8s. **V2** — NLI/faithfulness e LLM-as-judge calibrado on-prem, drift/alertas, migração à stack institucional plena (Postgres on-prem, Vault, ELK).
