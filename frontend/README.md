# goldendata — Front-end

Plataforma institucional de governança de IA do TJMG. SPA em **React 18 + TypeScript + Vite**,
com autenticação **OIDC contra Keycloak**, dados via **TanStack Query** e acessibilidade WCAG 2.1 AA.

Conforme diretrizes Conod, COARF/DIRTEC e CESEC/TJMG.

## Stack

- React 18 + TypeScript (componentes funcionais + hooks)
- Vite (build/preview)
- react-router-dom v6 (rotas por feature)
- @tanstack/react-query (dados/cache)
- oidc-client-ts (OpenID Connect / Keycloak)
- recharts (indicadores)
- Componentes próprios acessíveis + design tokens TJMG (`src/lib/theme.css`)

## Estrutura

```
src/
  lib/            api.ts (cliente tipado), auth-oidc.ts (useAuth/OIDC),
                  queries.ts (hooks de dados), types.ts, options.ts, env.ts, theme.css
  components/     Layout, RequireAuth, ui.tsx (campos, cards, alerts, tabelas)
  features/       auth, catalog, toolDetail, toolVersions, goldenDatasets,
                  evaluations, annotation, gate, indicators, audit, admin
```

## Pré-requisitos

- Node.js 20+
- Um realm Keycloak com um client público (SPA) e a stack FastAPI rodando.

## Configuração

Copie `.env.example` para `.env` e ajuste:

```
VITE_API_URL=http://localhost:8000
VITE_OIDC_AUTHORITY=http://localhost:8080/realms/goldendata
VITE_OIDC_CLIENT_ID=goldendata-frontend
VITE_OIDC_REDIRECT_URI=http://localhost:5173/auth/callback
```

No Keycloak, cadastre `http://localhost:5173/auth/callback` como Redirect URI e a origem
`http://localhost:5173` como Web Origin. Mapeie os papéis (`coordenador_comite`, `owner_ferramenta`,
`avaliador`, `auditor_dpo`, `admin`) em `realm_access.roles`.

## Como rodar

```bash
npm install
npm run dev        # ambiente de desenvolvimento (http://localhost:5173)
npm run build      # checagem de tipos + build de produção (dist/)
npm run preview    # serve o build localmente
npm run lint       # ESLint
npm run typecheck  # checagem de tipos isolada
```

## Docker

```bash
docker build -t goldendata-frontend .
docker run -p 8080:8080 goldendata-frontend   # http://localhost:8080
```

O `nginx.conf` aplica headers de segurança (CSP, HSTS, X-Frame-Options DENY,
X-Content-Type-Options nosniff, Referrer-Policy) e fallback SPA. As variáveis `VITE_*`
são resolvidas em tempo de build; para reconfigurar o ambiente, refaça o build.

## Papéis (RBAC)

A UI esconde/desabilita ações conforme `roles` retornados em `/api/me`:

- **coordenador_comite / admin** — decidem o gate de promoção; administração.
- **owner_ferramenta** — edita a ficha técnica e versões.
- **avaliador** — anota a fila human-in-the-loop.
- **auditor_dpo** — acessa a trilha de auditoria.

## Acessibilidade

HTML semântico, labels associados, foco visível, navegação por teclado, `aria-live`
para feedback, contraste AA, `lang="pt-BR"` e skip link para o conteúdo principal.
