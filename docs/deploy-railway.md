# Deploy no Railway

Sim — dá para rodar **toda a plataforma no Railway**, sem mudar o código. Como o banco é Postgres puro e cada serviço tem Dockerfile, o Railway hospeda: **Postgres** (plugin gerenciado) + **Keycloak** + **backend** + **frontend**. Isso respeita o princípio COARF de infraestrutura agnóstica (o Supabase deixa de ser necessário; o mesmo projeto pode depois migrar para a stack on-prem do TJMG).

> Para a **demonstração ao comitê**, o caminho abaixo sobe tudo em minutos. Para produção, veja as notas de hardening ao final.

## ⚠️ Passo 0 — Root Directory (evita o erro "Railpack could not determine how to build")

Este repositório é um **monorepo**: a raiz não é um app. Se você criar um serviço apontando para a raiz, o Railpack falha com *"Railpack could not determine how to build the app"*. **Crie um serviço por componente** e, em cada um, configure:

**Settings → Source → Root Directory**:

| Serviço | Root Directory |
|---|---|
| backend | `backend` |
| frontend | `frontend` |
| keycloak | `infra/keycloak` |

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

## 2. Keycloak (serviço Docker)

Crie um serviço com **Root Directory = `infra/keycloak`** (o Dockerfile já embute o realm `tjmg`). Ao gerar o domínio público, escolha a **porta 8080** como target. Variáveis:

| Variável | Valor |
|---|---|
| `KC_BOOTSTRAP_ADMIN_USERNAME` | `admin` |
| `KC_BOOTSTRAP_ADMIN_PASSWORD` | (segredo forte) |
| `KC_PROXY_HEADERS` | `xforwarded` |
| `KC_HOSTNAME` | a URL pública do serviço (ex.: `https://sso.up.railway.app`) |

Anote a URL pública → será a **authority OIDC** (`https://sso.../realms/tjmg`).

## 3. Backend (serviço Docker — Root Directory = `backend`)

| Variável | Valor |
|---|---|
| `GOLDENDATA_DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referência ao plugin) |
| `GOLDENDATA_OIDC_ISSUER` | `https://sso.../realms/tjmg` |
| `GOLDENDATA_OIDC_JWKS_URL` | `https://sso.../realms/tjmg/protocol/openid-connect/certs` |
| `GOLDENDATA_OIDC_AUDIENCE` | `goldendata-api` |
| `GOLDENDATA_CORS_ORIGINS` | a URL pública do frontend |
| `GOLDENDATA_AUTH_DEV_INSECURE` | `false` |

O FastAPI escuta na 8000; o Railway roteia via `$PORT` automaticamente para serviços HTTP (ou ajuste o `CMD` para `--port $PORT`).

## 4. Frontend (serviço Docker — Root Directory = `frontend`)

Ao gerar o domínio público, escolha a **porta 8080** como target (o nginx escuta nela). As `VITE_*` são **build-time** — configure-as como variáveis do serviço (o Railway as repassa como build args; o `frontend/Dockerfile` já as declara como `ARG`):

| Variável | Valor |
|---|---|
| `VITE_API_URL` | URL pública do backend |
| `VITE_OIDC_AUTHORITY` | `https://sso.../realms/tjmg` |
| `VITE_OIDC_CLIENT_ID` | `goldendata-spa` |
| `VITE_OIDC_REDIRECT_URI` | URL pública do frontend (ex.: `https://app.../`) |

Depois, no Keycloak, ajuste no cliente `goldendata-spa` os **Redirect URIs** e **Web Origins** para a URL pública do frontend.

## Notas de produção (hardening)

- Keycloak demo usa `start-dev`. Em produção: `start --optimized` com banco dedicado (`KC_DB=postgres`, `KC_DB_URL`), `KC_HOSTNAME` fixo e TLS no proxy do Railway (HTTPS já é fornecido).
- Troque todas as senhas demo do realm e exija MFA (Portaria CNJ 140/2024).
- Restrinja `connect-src` da CSP do nginx (`frontend/nginx.conf`) às URLs reais de backend/SSO.
- Defina retenção/eliminação dos dados (LGPD) e backups do Postgres.
- O `CMD` do backend pode ser ajustado para `uvicorn app.main:app --host 0.0.0.0 --port $PORT` se o Railway exigir a porta dinâmica.
