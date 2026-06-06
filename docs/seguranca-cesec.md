# Segurança (CESEC/TJMG) — como o MVP atende

Mapa dos controles do CESEC implementados na plataforma (e o que fica para as próximas fases).

| Controle CESEC | Onde no código | Status |
|---|---|---|
| Autenticação OIDC via Keycloak | `core/security_keycloak.py` (validação RS256 contra JWKS, issuer, audience) | ✅ MVP |
| MFA obrigatório | Configuração do realm Keycloak (política de autenticação) | ⚙️ configurar no realm de produção |
| RBAC + privilégio mínimo | `require_role(...)` nas rotas; papéis `coordenador_comite/owner_ferramenta/avaliador/auditor_dpo/admin` | ✅ MVP |
| Segregação de funções (quem edita ≠ quem promove) | gate decidido só por `coordenador_comite/admin`; anotação por `avaliador` | ✅ MVP |
| Delegação de autorização com vigência | `role_assignment` (`via_delegacao`, `vigencia_fim`) | ✅ esquema (UI na V1) |
| Queries parametrizadas (anti-SQLi) | psycopg com `%s` em todo o acesso; nunca concatenação | ✅ MVP |
| Validação de entrada / codificação de saída | Pydantic (schemas) na entrada; FastAPI serializa a saída | ✅ MVP |
| Proteção IDOR/BOLA | autorização por papel; autorização a nível de objeto (owner/unidade) | ⚙️ reforçar por objeto na V1 |
| Headers de segurança (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy) | `SecurityHeadersMiddleware` (back-end) + `nginx.conf` (front-end) | ✅ MVP |
| TLS 1.3 / HTTPS-only / HSTS | terminação TLS no ingress/produção; HSTS já emitido | ⚙️ TLS no ambiente |
| Segredos fora do código | variáveis de ambiente (`core/config.py`); cofre (Vault) na evolução | ✅ MVP / ⚙️ Vault |
| Senhas com KDF | delegado ao Keycloak (não há senhas na aplicação) | ✅ |
| Mascaramento de dados pessoais (CPF formato Pix) | `core/masking.py` (`***.777.888-**`) | ✅ MVP |
| Classificação de PII antes de persistir | flags `golden_case.contem_pii`, `data_inventory.*` | ✅ MVP |
| Trilha de auditoria (quem/quando/o quê/onde/como) | `audit_log` + triggers; IP via X-Forwarded-For; User-Agent | ✅ MVP |
| Integridade da auditoria (tamper-evident) | encadeamento por hash SHA-256; `GET /governance/audit-log/verify` | ✅ MVP |
| Sincronização de horário (HLB) | relógio do servidor de banco via NTP/NTS (`now()` em UTC/HLB) | ⚙️ NTP no host |
| Retenção de logs ≥ 6 meses | política de retenção do `audit_log` + ELK na evolução | ⚙️ operacional |
| Hardening de container (não-root) | `backend/Dockerfile` (usuário `appuser`) | ✅ MVP |
| SAST/DAST/SCA no CI | `ruff` (lint); adicionar `bandit` (SAST), `pip-audit` (SCA), ZAP (DAST) | ⚙️ pipeline CI |

✅ = implementado no MVP · ⚙️ = configuração/infra ou fase seguinte.

## Notas

- **Modo dev inseguro** (`GOLDENDATA_AUTH_DEV_INSECURE`) existe apenas para testes locais sem Keycloak; é bloqueado em produção por política de deploy.
- A autorização **a nível de objeto** (um owner só acessa ferramentas da sua unidade) está parcialmente coberta por papel; o reforço por `tool_id`/unidade entra na V1, fechando IDOR/BOLA por completo (OWASP API Security Top 10).
- O **gate é fail-closed**: sem critérios objetivos definidos, a promoção é reprovada; a supervisão humana não pode sobrepor um gate reprovado.
