# Servidor MCP — operar o goldendata por IAs

O backend expõe um servidor **MCP (Model Context Protocol)** que permite a agentes
de IA (Claude Code, Claude Desktop e outros clientes MCP) **operar a plataforma
diretamente** — consultar o catálogo, abrir fichas técnicas, registrar ferramentas,
anotar avaliações e decidir o gate de promoção. Toda operação passa pelos serviços
existentes e entra na **trilha de auditoria** (ator `mcp`).

- **Transporte:** Streamable HTTP (MCP remoto).
- **Endpoint:** `https://<backend>/mcp` — **sem barra final** (`/mcp/` redireciona com 307 e alguns clientes perdem o header de autenticação no redirect).
- **Implementação:** [`backend/app/mcp_server.py`](../backend/app/mcp_server.py) (SDK oficial `mcp`, `FastMCP` com `stateless_http=True, json_response=True`), montado em [`backend/app/main.py`](../backend/app/main.py).

## Ferramentas disponíveis

| Ferramenta | Tipo | O que faz |
|---|---|---|
| `listar_ferramentas` | leitura | Lista o catálogo de ferramentas/agentes (3.2). |
| `obter_ficha_tecnica` | leitura | Ficha técnica consolidada de uma ferramenta (CNJ 615). |
| `listar_modelos_base` | leitura | Modelos-base cadastrados (provedor/versão/hospedagem). |
| `obter_indicadores_qualidade` | leitura | KPIs (aceitação, correção, alucinação) por ferramenta (3.3). |
| `obter_metricas_avaliacao` | leitura | Métricas agregadas de uma execução de avaliação. |
| `verificar_auditoria` | leitura | Consulta a trilha e verifica a integridade da cadeia de hashes. |
| `registrar_ferramenta` | escrita | Cadastra uma nova ferramenta/agente no catálogo. |
| `criar_modelo_base` | escrita | Cadastra um modelo-base de IA. |
| `anotar_saida` | escrita | Registra anotação humana (aceite/correção/rejeição) de uma saída. |
| `decidir_gate` | escrita | Aprova/reprova a promoção de uma versão para produção. |

## Autenticação

Proteção por **token Bearer** via a variável `GOLDENDATA_MCP_TOKEN` (suporta vários
tokens separados por vírgula, para rotação). Comparação em tempo constante (CESEC).
Se a variável estiver **vazia**, o MCP fica **aberto** — use apenas em demonstração.

Gere um token forte:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

A variável `GOLDENDATA_MCP_ALLOWED_HOSTS` (CSV) lista os hosts aceitos no header
`Host` (proteção anti DNS-rebinding do SDK). Atrás de um proxy (Railway), defina o
domínio público, ex.: `goldendata-backend-production.up.railway.app`. Vazio desliga
a proteção (apropriado para dev local, já protegido por token + TLS).

## Conectar pelo Claude Code (CLI) — recomendado

```bash
claude mcp add --transport http goldendata \
  https://<backend>/mcp \
  --header "Authorization: Bearer <SEU_TOKEN>" \
  --scope user
```

Verifique: `claude mcp get goldendata` (deve mostrar `Status: ✓ Connected`). Dentro
do Claude Code, `/mcp` lista o servidor e suas ferramentas. As ferramentas carregam
na **inicialização da sessão** — reinicie o Claude Code após adicionar.

## Claude Desktop

Edite `claude_desktop_config.json` usando uma ponte HTTP (o Desktop nativo só fala
stdio; `mcp-remote` faz a ponte e repassa o header):

```json
{
  "mcpServers": {
    "goldendata": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://<backend>/mcp",
        "--header", "Authorization: Bearer <SEU_TOKEN>"
      ]
    }
  }
}
```

## claude.ai (web) / interface "Connectors"

A interface de **Connectors** (web e o "Add custom connector" do Desktop) **não usa
token Bearer estático** — ela exige **OAuth** (faz *dynamic client registration*
contra o servidor). Por isso aparece o erro *"Couldn't register with the sign-in
service / add an OAuth Client ID"*. Hoje o servidor não expõe OAuth, então **use o
Claude Code CLI** (acima). Habilitar a via web exigiria adicionar um *authorization
server* OAuth ao MCP (roadmap).

## Teste manual (curl)

```bash
TOKEN="<SEU_TOKEN>"
curl -s -X POST https://<backend>/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'
```

Resposta esperada: um JSON-RPC com `"serverInfo":{"name":"goldendata",...}`. Sem o
token (quando exigido) o servidor responde **401**; com `Host` fora da allowlist, **421**.

## Segurança (CESEC)

- Token ≥ 32 bytes, guardado em variável de ambiente (nunca no git); servido sempre via HTTPS.
- O modo de autenticação `none` da aplicação deixa o `/api` aberto; ainda assim, **defina `GOLDENDATA_MCP_TOKEN`** para o endpoint MCP não ficar exposto sem credencial.
- Como o escopo "completo" inclui **escrita**, quem tem o token pode gravar na base — para dados reais, ative o login institucional (modos `local`/`oidc`) e rotacione o token.
