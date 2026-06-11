# Deploy no Railway

Dá para rodar **toda a plataforma no Railway**, sem mudar o código. Como o banco é Postgres puro e cada serviço tem Dockerfile, o Railway hospeda: **Postgres** (plugin gerenciado) + **backend** + **frontend** — e, opcionalmente, **Keycloak** quando o login institucional for reativado. Isso respeita o princípio COARF de infraestrutura agnóstica.

> A configuração atual da demonstração é **SEM LOGIN** (`AUTH_MODE=none`): qualquer pessoa com a URL acessa como "Usuário de Demonstração" com todos os papéis. Use apenas com dados de demonstração. Os modos `local` (e-mail+senha) e `oidc` (Keycloak) ficam prontos para religar por configuração.

## ⚠️ Passo 0 — Root Directory (evita o erro "Railpack could not determine how to build")

Este repositório é um **monorepo**: a raiz não é um app. Se você criar um serviço apontando para a raiz, o Railpack falha com *"Railpack could not determine how to build the app"*. **Crie um serviço por componente** e, em cada um, configure:

**Settings → Source → Root Directory**:

| Serviço | Root Directory | Obrigatório? |
|---|---|---|
| backend | `backend` | sim |
| frontend | `frontend` | sim |
| keycloak | `infra/keycloak` | só no modo `oidc` (hoje: não) |

Com o Root Directory apontando para a pasta certa, o Railway encontra o `Dockerfile` e o `railway.json` daquele serviço (já comitados em cada pasta, forçando o builder **DOCKERFILE**) e o Railpack nem é acionado. O Postgres não é um serviço de build — use o **plugin** de banco do Railway.

## 1. Postgres (plugin)

Crie um banco PostgreSQL no projeto Railway. Ele expõe a variável `DATABASE_URL`.

**Aplicar o esquema** (migrations + seed) uma vez, a partir da sua máquina, usando a connection string pública do Railway:

```bash
export DATABASE_URL="postgresql://...railway..."   # copie do painel do Postgres
for f in db/migrations/*.sql db/seed/*.sql; do
  echo ">> $f"; psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

(Reaplicável: para um banco já criado, rode apenas os arquivos novos — ex.: `0006_local_auth.sql`.)

## 2. Backend (serviço Docker — Root Directory = `backend`)

| Variável | Valor |
|---|---|
| `GOLDENDATA_DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referência ao plugin) |
| `GOLDENDATA_AUTH_MODE` | `none` (sem login — demonstração) |
| `GOLDENDATA_CORS_ORIGINS` | a URL pública do frontend |

O FastAPI escuta em `$PORT` automaticamente.

## 3. Frontend (serviço Docker — Root Directory = `frontend`)

Ao gerar o domínio público, escolha a **porta 8080** como target (o nginx escuta nela). As `VITE_*` são **build-time** — configure-as como variáveis do serviço (o Railway as repassa como build args; o `frontend/Dockerfile` já as declara como `ARG`):

| Variável | Valor |
|---|---|
| `VITE_API_URL` | URL pública do backend |
| `VITE_AUTH_MODE` | `none` |

## Reativando o login depois (sem reescrever nada)

- **Modo `local`** (e-mail+senha no próprio backend, sem Keycloak): aplicar `db/migrations/0006_local_auth.sql` + `db/seed/0002_seed_local_auth.sql`, definir `GOLDENDATA_AUTH_MODE=local` + `GOLDENDATA_AUTH_SECRET` (segredo forte) no backend e `VITE_AUTH_MODE=local` no frontend. Requer concluir o endpoint `/api/auth/login` e o formulário de login (base já pronta em `backend/app/core/security_local.py`: PBKDF2, JWT HS256, rate limiting CESEC).
- **Modo `oidc`** (Keycloak — produção institucional): criar o serviço keycloak (Root Directory `infra/keycloak`, domínio na porta 8080, `KC_PROXY_HEADERS=xforwarded` e `KC_HOSTNAME=<URL pública>` — sem isso o Keycloak atrás do proxy do Railway gera redirects/issuer errados), e configurar:
  - backend: `GOLDENDATA_AUTH_MODE=oidc`, `GOLDENDATA_OIDC_ISSUER=https://sso.../realms/tjmg`, `GOLDENDATA_OIDC_JWKS_URL=.../protocol/openid-connect/certs`, `GOLDENDATA_OIDC_AUDIENCE=goldendata-api`;
  - frontend (rebuild): `VITE_AUTH_MODE=oidc`, `VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID=goldendata-spa`, `VITE_OIDC_REDIRECT_URI=<URL do frontend>`;
  - no Keycloak, cadastrar a URL do frontend em **Redirect URIs** e **Web Origins** do cliente `goldendata-spa`.

## Notas de produção (hardening)

- O modo `none` é **somente para demonstração** — nunca com dados reais (CESEC exige identificação única e personalíssima; CNJ 140/2024 exige MFA).
- Restrinja `connect-src` da CSP do nginx (`frontend/nginx.conf`) às URLs reais de backend/SSO.
- Defina retenção/eliminação dos dados (LGPD) e backups do Postgres.
- Em produção institucional: Keycloak com `start --optimized`, banco dedicado (`KC_DB=postgres`), MFA obrigatório e senhas demo trocadas.
