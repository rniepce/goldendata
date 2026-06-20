/*
 * Cliente de API central e tipado (diretriz Conod/COARF).
 * - Base: VITE_API_URL + prefixo /api.
 * - Todas as chamadas enviam Authorization: Bearer <access_token> do OIDC.
 * - Tratamento uniforme de erros (ApiError) com status e mensagem em pt-BR.
 */

import { env } from './env';
import { getAccessToken } from './auth-oidc';
import type {
  Annotation,
  AnnotationInput,
  AuditLogEntry,
  AuditVerifyResult,
  DataInventory,
  DataInventoryInput,
  EvalRun,
  EvalRunInput,
  EvalRunResult,
  EvalOutputInput,
  Gate,
  GateDecisionInput,
  GateInput,
  GoldenCase,
  GoldenCaseInput,
  GoldenDataset,
  GoldenDatasetInput,
  BriefingReuniao,
  ChatResposta,
  ChatTurno,
  CockpitData,
  CopilotoResposta,
  Comentario,
  ComentarioInput,
  Demanda,
  DemandaInput,
  DemandaSugestaoIA,
  DemandaTriagemInput,
  Encaminhamento,
  EncaminhamentoInput,
  Incidente,
  IncidenteInput,
  IncidenteSugestao,
  RiscoSugestao,
  ToolSaude,
  ConformidadeResultado,
  Documento,
  DocumentoInput,
  ExtracaoCard,
  Iniciativa,
  IniciativaInput,
  PlanoPessoal,
  RedacaoSei,
  KpiQuality,
  ModelBase,
  ModelBaseInput,
  PromptVersion,
  PromptVersionInput,
  RoleAssignment,
  RoleAssignmentInput,
  SupabaseUser,
  SupabaseUserInput,
  Rubric,
  RubricInput,
  SearchResult,
  Tool,
  ToolFicha,
  ToolInput,
  ToolUpdateInput,
  ToolVersion,
  ToolVersionInput,
  UserInfo,
} from './types';

const API_BASE = `${env.apiUrl}/api`;

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options;
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const message =
      (isJson && payload && typeof payload === 'object' && 'detail' in payload
        ? String((payload as { detail: unknown }).detail)
        : null) ?? mensagemPadraoPorStatus(response.status);
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}

async function requestForm<T>(path: string, form: FormData): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  // Não definir Content-Type: o browser adiciona o boundary do multipart.
  let response: Response;
  try {
    response = await fetch(buildUrl(path), { method: 'POST', headers, body: form });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.');
  }
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : await response.text();
  if (!response.ok) {
    const message =
      (isJson && payload && typeof payload === 'object' && 'detail' in payload
        ? String((payload as { detail: unknown }).detail)
        : null) ?? mensagemPadraoPorStatus(response.status);
    throw new ApiError(response.status, message, payload);
  }
  return payload as T;
}

function mensagemPadraoPorStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Requisição inválida. Revise os dados informados.';
    case 401:
      return 'Sessão expirada ou não autenticada. Faça login novamente.';
    case 403:
      return 'Você não tem permissão para executar esta ação.';
    case 404:
      return 'Recurso não encontrado.';
    case 409:
      return 'Conflito: a operação foi bloqueada pelas regras de negócio.';
    case 422:
      return 'Dados inconsistentes. Verifique os campos obrigatórios.';
    default:
      return status >= 500
        ? 'Erro interno no servidor. Tente novamente mais tarde.'
        : 'Ocorreu um erro ao processar a requisição.';
  }
}

/* ---------- Endpoints tipados ---------- */
export const api = {
  // Identidade
  me: (): Promise<UserInfo> => request('/me'),

  // Registro (3.2)
  listModelBases: (): Promise<ModelBase[]> => request('/registry/model-bases'),
  createModelBase: (input: ModelBaseInput): Promise<ModelBase> =>
    request('/registry/model-bases', { method: 'POST', body: input }),

  listTools: (): Promise<Tool[]> => request('/registry/tools'),
  createTool: (input: ToolInput): Promise<Tool> =>
    request('/registry/tools', { method: 'POST', body: input }),
  updateTool: (toolId: string, input: ToolUpdateInput): Promise<Tool> =>
    request(`/registry/tools/${toolId}`, { method: 'PATCH', body: input }),
  toolSaude: (toolId: string): Promise<ToolSaude> => request(`/registry/tools/${toolId}/saude`),
  getToolFicha: (toolId: string): Promise<ToolFicha> =>
    request(`/registry/tools/${toolId}/ficha`),

  createPromptVersion: (toolId: string, input: PromptVersionInput): Promise<PromptVersion> =>
    request(`/registry/tools/${toolId}/prompt-versions`, { method: 'POST', body: input }),
  createToolVersion: (toolId: string, input: ToolVersionInput): Promise<ToolVersion> =>
    request(`/registry/tools/${toolId}/versions`, { method: 'POST', body: input }),
  createDataInventory: (toolId: string, input: DataInventoryInput): Promise<DataInventory> =>
    request(`/registry/tools/${toolId}/data-inventory`, { method: 'POST', body: input }),

  // Avaliação (3.3)
  createRubric: (input: RubricInput): Promise<Rubric> =>
    request('/evaluation/rubrics', { method: 'POST', body: input }),
  createGoldenDataset: (input: GoldenDatasetInput): Promise<GoldenDataset> =>
    request('/evaluation/golden-datasets', { method: 'POST', body: input }),
  createGoldenCase: (datasetId: string, input: GoldenCaseInput): Promise<GoldenCase> =>
    request(`/evaluation/golden-datasets/${datasetId}/cases`, { method: 'POST', body: input }),

  createEvalRun: (input: EvalRunInput): Promise<EvalRun> =>
    request('/evaluation/eval-runs', { method: 'POST', body: input }),
  submitEvalOutputs: (
    runId: string,
    outputs: EvalOutputInput[],
  ): Promise<EvalRunResult> =>
    request(`/evaluation/eval-runs/${runId}/outputs`, {
      method: 'POST',
      body: { outputs },
    }),
  getEvalRun: (runId: string): Promise<EvalRun> =>
    request(`/evaluation/eval-runs/${runId}`),

  createAnnotation: (input: AnnotationInput): Promise<Annotation> =>
    request('/evaluation/annotations', { method: 'POST', body: input }),

  rollupKpi: (toolId: string, versionId: string): Promise<KpiQuality> =>
    request(`/evaluation/tools/${toolId}/versions/${versionId}/kpi`, { method: 'POST' }),
  getToolKpi: (toolId: string): Promise<KpiQuality[]> =>
    request(`/evaluation/tools/${toolId}/kpi`),

  createGate: (versionId: string, input: GateInput): Promise<Gate> =>
    request(`/evaluation/versions/${versionId}/gate`, { method: 'POST', body: input }),
  decideGate: (gateId: string, input: GateDecisionInput): Promise<Gate> =>
    request(`/evaluation/gates/${gateId}/decide`, { method: 'POST', body: input }),

  // Governança
  getAuditLog: (params: {
    entidade?: string;
    entidade_id?: string;
    limite?: number;
  }): Promise<AuditLogEntry[]> =>
    request('/governance/audit-log', { query: params }),
  verifyAuditChain: (): Promise<AuditVerifyResult> =>
    request('/governance/audit-log/verify'),
  createRoleAssignment: (input: RoleAssignmentInput): Promise<RoleAssignment> =>
    request('/governance/role-assignments', { method: 'POST', body: input }),

  // Assistente (busca global + IA)
  busca: (q: string): Promise<SearchResult> => request('/busca', { query: { q } }),
  iaDisponivel: (): Promise<{ disponivel: boolean }> => request('/ia/disponivel'),
  resumirFerramenta: (toolId: string): Promise<{ resumo: string }> =>
    request(`/ia/resumir-ferramenta/${toolId}`, { method: 'POST' }),
  perguntarIA: (pergunta: string): Promise<{ resposta: string }> =>
    request('/ia/perguntar', { method: 'POST', body: { pergunta } }),
  chatIA: (pergunta: string, historico: ChatTurno[]): Promise<ChatResposta> =>
    request('/ia/chat', { method: 'POST', body: { pergunta, historico } }),
  copilotoPlanejar: (mensagem: string, historico: ChatTurno[]): Promise<CopilotoResposta> =>
    request('/ia/copiloto', { method: 'POST', body: { mensagem, historico } }),
  copilotoExecutar: (
    ferramenta: string,
    args: Record<string, unknown>,
  ): Promise<{ ok: boolean; ferramenta: string; resultado: unknown }> =>
    request('/ia/copiloto/executar', { method: 'POST', body: { ferramenta, args } }),
  conformidadeFerramenta: (toolId: string): Promise<ConformidadeResultado> =>
    request(`/ia/conformidade/${toolId}`),
  redigirRespostaSei: (form: FormData): Promise<RedacaoSei> =>
    requestForm('/ia/redigir-resposta-sei', form),
  extrairCard: (form: FormData): Promise<ExtracaoCard> => requestForm('/ia/extrair-card', form),
  planoPessoal: (): Promise<PlanoPessoal> => request('/ia/plano-pessoal'),
  explicarGate: (
    gateId: string,
  ): Promise<{ gate_id: string; veredito: string; explicacao: string }> =>
    request(`/ia/explicar-gate/${gateId}`),
  sugerirRisco: (texto: string): Promise<RiscoSugestao> =>
    request('/ia/sugerir-risco', { method: 'POST', body: { texto } }),
  briefingReuniao: (): Promise<BriefingReuniao> => request('/ia/briefing-reuniao'),
  vigilia: (): Promise<{ boletim: string; contadores: CockpitData['contadores'] }> =>
    request('/ia/vigilia'),
  redigirIncidente: (
    toolId: string,
    descricaoBreve: string,
  ): Promise<{ sugestao: IncidenteSugestao; bruto: string | null }> =>
    request('/ia/redigir-incidente', {
      method: 'POST',
      body: { tool_id: toolId, descricao_breve: descricaoBreve },
    }),
  triarDemandaIA: (titulo: string, problema?: string): Promise<{ sugestao: DemandaSugestaoIA }> =>
    request('/ia/triar-demanda', { method: 'POST', body: { titulo, problema } }),
  coerencia: (toolId: string): Promise<{ tool_id: string; achados: string }> =>
    request(`/ia/coerencia/${toolId}`),

  // Iniciativas do GEX-IA (Painel)
  listIniciativas: (params?: {
    categoria?: string;
    status?: string;
    responsavel?: string;
  }): Promise<Iniciativa[]> => request('/iniciativas', { query: params }),
  getIniciativa: (id: string): Promise<Iniciativa> => request(`/iniciativas/${id}`),
  createIniciativa: (input: IniciativaInput): Promise<Iniciativa> =>
    request('/iniciativas', { method: 'POST', body: input }),
  updateIniciativa: (id: string, input: Partial<IniciativaInput>): Promise<Iniciativa> =>
    request(`/iniciativas/${id}`, { method: 'PATCH', body: input }),
  deleteIniciativa: (id: string): Promise<void> =>
    request(`/iniciativas/${id}`, { method: 'DELETE' }),
  listComentarios: (iniciativaId: string): Promise<Comentario[]> =>
    request(`/iniciativas/${iniciativaId}/comentarios`),
  addComentario: (iniciativaId: string, input: ComentarioInput): Promise<Comentario> =>
    request(`/iniciativas/${iniciativaId}/comentarios`, { method: 'POST', body: input }),
  resolverComentario: (comentarioId: string, resolvido: boolean): Promise<Comentario> =>
    request(`/iniciativas/comentarios/${comentarioId}`, { method: 'PATCH', body: { resolvido } }),
  deleteComentario: (comentarioId: string): Promise<void> =>
    request(`/iniciativas/comentarios/${comentarioId}`, { method: 'DELETE' }),

  // Cockpit de pendências do comitê
  cockpit: (): Promise<CockpitData> => request('/cockpit'),

  // Balcão de demandas (#37)
  listDemandas: (status?: string): Promise<Demanda[]> =>
    request('/demandas', { query: { status } }),
  createDemanda: (input: DemandaInput): Promise<Demanda> =>
    request('/demandas', { method: 'POST', body: input }),
  triarDemanda: (id: string, input: DemandaTriagemInput): Promise<Demanda> =>
    request(`/demandas/${id}/triagem`, { method: 'POST', body: input }),

  // Incidentes (#1)
  listIncidentes: (toolId?: string): Promise<Incidente[]> =>
    request('/incidentes', { query: { tool_id: toolId } }),
  createIncidente: (input: IncidenteInput): Promise<Incidente> =>
    request('/incidentes', { method: 'POST', body: input }),
  updateIncidente: (id: string, input: Partial<IncidenteInput>): Promise<Incidente> =>
    request(`/incidentes/${id}`, { method: 'PATCH', body: input }),

  // Encaminhamentos (#42)
  listEncaminhamentos: (params?: {
    responsavel?: string;
    status?: string;
  }): Promise<Encaminhamento[]> => request('/encaminhamentos', { query: params }),
  createEncaminhamento: (input: EncaminhamentoInput): Promise<Encaminhamento> =>
    request('/encaminhamentos', { method: 'POST', body: input }),
  updateEncaminhamento: (
    id: string,
    input: Partial<EncaminhamentoInput> & { status?: string },
  ): Promise<Encaminhamento> => request(`/encaminhamentos/${id}`, { method: 'PATCH', body: input }),

  // Base de conhecimento (corpus do RAG)
  listDocumentos: (params?: { tipo?: string; q?: string }): Promise<Documento[]> =>
    request('/conhecimento', { query: params }),
  getDocumento: (id: string): Promise<Documento> => request(`/conhecimento/${id}`),
  createDocumento: (input: DocumentoInput): Promise<Documento> =>
    request('/conhecimento', { method: 'POST', body: input }),
  updateDocumento: (id: string, input: Partial<DocumentoInput>): Promise<Documento> =>
    request(`/conhecimento/${id}`, { method: 'PATCH', body: input }),
  deleteDocumento: (id: string): Promise<void> =>
    request(`/conhecimento/${id}`, { method: 'DELETE' }),
  reindexDocumento: (id: string): Promise<{ documento_id: string; chunks: number }> =>
    request(`/conhecimento/${id}/reindex`, { method: 'POST' }),

  // Gestão de usuários (Supabase Auth)
  listUsers: (): Promise<SupabaseUser[]> => request('/governance/users'),
  createUser: (input: SupabaseUserInput): Promise<SupabaseUser> =>
    request('/governance/users', { method: 'POST', body: input }),
  deleteUser: (id: string): Promise<void> =>
    request(`/governance/users/${id}`, { method: 'DELETE' }),
};
