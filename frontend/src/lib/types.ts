/*
 * Tipagem central do contrato da API (back-end FastAPI).
 * Todas as estruturas trafegadas têm interface/type — diretriz Conod (tudo tipado).
 */

// ---------- Identidade / RBAC ----------
export type Role =
  | 'coordenador_comite'
  | 'owner_ferramenta'
  | 'avaliador'
  | 'auditor_dpo'
  | 'admin';

export interface UserInfo {
  sub: string;
  nome: string;
  email: string;
  roles: Role[];
}

/** Usuário do Supabase Auth (gestão de logins na área de Administração). */
export interface SupabaseUser {
  id: string;
  email: string;
  nome: string | null;
  roles: Role[];
  criado_em: string | null;
  ultimo_acesso: string | null;
}

export interface SupabaseUserInput {
  email: string;
  nome: string;
  senha: string;
  roles: Role[];
}

// ---------- Iniciativas do GEX-IA (Painel) ----------
export type IniciativaCategoria =
  | 'solucao_ia'
  | 'educacional'
  | 'suporte'
  | 'governanca_normativo'
  | 'cooperacao'
  | 'pesquisa_prospeccao';

export type IniciativaStatus =
  | 'a_fazer'
  | 'em_andamento'
  | 'em_pausa'
  | 'concluido'
  | 'cancelado';

export type IniciativaPrioridade = 'baixa' | 'media' | 'alta';

export interface Iniciativa {
  id: string;
  titulo: string;
  resumo: string | null;
  categoria: IniciativaCategoria;
  status: IniciativaStatus;
  prioridade: IniciativaPrioridade;
  responsavel_email: string | null;
  responsavel_nome: string | null;
  tool_id: string | null;
  processo_sei: string | null;
  prazo: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface IniciativaInput {
  titulo: string;
  resumo?: string | null;
  categoria: IniciativaCategoria;
  status?: IniciativaStatus;
  prioridade?: IniciativaPrioridade;
  responsavel_email?: string | null;
  responsavel_nome?: string | null;
  tool_id?: string | null;
  processo_sei?: string | null;
  prazo?: string | null;
}

// ---------- Registro (3.2) ----------
export type Hospedagem = 'api_externa' | 'on_premise' | 'nuvem_homologada';

export interface ModelBase {
  id: string;
  provedor: string;
  nome: string;
  versao: string;
  hospedagem: Hospedagem;
  notas_conformidade?: string;
}

export interface ModelBaseInput {
  provedor: string;
  nome: string;
  versao: string;
  hospedagem: Hospedagem;
  notas_conformidade?: string;
}

export type TipoFerramenta = 'ferramenta' | 'agente';
export type CategoriaRisco = 'alto' | 'baixo';

export interface Tool {
  id: string;
  codigo_institucional: string;
  nome: string;
  tipo: TipoFerramenta;
  descricao?: string;
  unidade_responsavel: string;
  categoria_risco?: CategoriaRisco;
  justificativa_risco?: string;
  vedacoes_checklist?: Record<string, boolean>;
  grau_supervisao_humana: string;
  revisao_humana_obrigatoria: boolean;
  explicacao_linguagem_simples?: string;
  sinapses_id?: string;
  proxima_revisao_em?: string; // date ISO
  status_ciclo_vida?: string;
  // Dossiê de Governança GEX-IA (CNJ 615)
  categoria_risco_cnj?: string;
  processo_sei?: string;
  estagio_gexia?: string;
  fase_gexia?: string;
  desenvolvimento?: string;
  instituicao_parceira?: string;
  interfaces_institucionais?: string;
  riscos_identificados?: string[];
  proximos_passos?: string;
  status_governanca?: string;
  analista_responsavel?: string;
  documento_origem?: string;
  data_analise?: string; // date ISO
  observacoes?: string;
  origem_registro?: string;
}

export interface ToolInput {
  codigo_institucional: string;
  nome: string;
  tipo: TipoFerramenta;
  descricao?: string;
  unidade_responsavel: string;
  categoria_risco?: CategoriaRisco;
  justificativa_risco?: string;
  vedacoes_checklist?: Record<string, boolean>;
  grau_supervisao_humana: string;
  revisao_humana_obrigatoria: boolean;
  explicacao_linguagem_simples?: string;
  sinapses_id?: string;
  proxima_revisao_em?: string;
}

export interface AgentSpec {
  id: string;
  tool_id: string;
  objetivo?: string;
  limites?: string;
  ferramentas_disponiveis?: string[];
  [key: string]: unknown;
}

export type NaturezaDado = 'treino_finetuning' | 'rag_base' | 'contexto_runtime';
export type BaseLegal =
  | 'funcao_jurisdicional'
  | 'obrigacao_legal'
  | 'politica_publica'
  | 'legitimo_interesse'
  | 'consentimento'
  | 'nao_se_aplica';

export interface DataInventory {
  id: string;
  tool_id: string;
  natureza: NaturezaDado;
  origem: string;
  categorias_dados: string[];
  contem_dados_pessoais: boolean;
  contem_dados_sensiveis: boolean;
  contem_dados_criancas: boolean;
  contem_sigilo: boolean;
  base_legal: BaseLegal;
  tecnicas_protecao?: Record<string, unknown>;
  retencao_criterio?: string;
  descarte_programado_em?: string;
  finalidade_exclusiva_jurisdicional: boolean;
  ripd_requerido: boolean;
}

export interface DataInventoryInput {
  natureza: NaturezaDado;
  origem: string;
  categorias_dados: string[];
  contem_dados_pessoais: boolean;
  contem_dados_sensiveis: boolean;
  contem_dados_criancas: boolean;
  contem_sigilo: boolean;
  base_legal: BaseLegal;
  tecnicas_protecao?: Record<string, unknown>;
  retencao_criterio?: string;
  descarte_programado_em?: string;
  finalidade_exclusiva_jurisdicional: boolean;
  ripd_requerido: boolean;
}

export interface PromptVersion {
  id: string;
  tool_id: string;
  versao: string;
  conteudo: string;
  parent_version?: string;
  changelog?: string;
  criado_em?: string;
}

export interface PromptVersionInput {
  versao: string;
  conteudo: string;
  parent_version?: string;
  changelog?: string;
}

export interface ToolVersion {
  id: string;
  tool_id: string;
  versao: string;
  model_base_id: string;
  prompt_version_id?: string;
  config?: Record<string, unknown>;
  git_commit?: string;
  changelog?: string;
  criado_em?: string;
}

export interface ToolVersionInput {
  versao: string;
  model_base_id: string;
  prompt_version_id?: string;
  config?: Record<string, unknown>;
  git_commit?: string;
  changelog?: string;
}

export interface Risk {
  id: string;
  tool_id: string;
  descricao: string;
  severidade?: string;
  mitigacao?: string;
  [key: string]: unknown;
}

export interface Attachment {
  id: string;
  tool_id: string;
  nome: string;
  url?: string;
  tipo?: string;
  [key: string]: unknown;
}

export interface ToolFicha {
  ferramenta: Tool;
  agent_spec: AgentSpec | null;
  data_inventory: DataInventory[];
  prompt_versions: PromptVersion[];
  tool_versions: ToolVersion[];
  risks: Risk[];
  attachments: Attachment[];
}

// ---------- Avaliação (3.3) ----------
export type EscalaRubrica = 'binaria' | 'escala_3' | 'escala_5';

export interface Rubric {
  id: string;
  nome: string;
  versao: string;
  escala: EscalaRubrica;
  dimensoes?: Record<string, unknown>[];
  labels?: Record<string, unknown>;
}

export interface RubricInput {
  nome: string;
  versao: string;
  escala: EscalaRubrica;
  dimensoes?: Record<string, unknown>[];
  labels?: Record<string, unknown>;
}

export type DominioDataset =
  | 'minuta'
  | 'despacho'
  | 'decisao'
  | 'relatorio'
  | 'sentenca'
  | 'outro';

export interface GoldenDataset {
  id: string;
  tool_id: string;
  nome: string;
  dominio: DominioDataset;
  versao: string;
  parent_version?: string;
  changelog?: string;
  origem_predominante: string;
}

export interface GoldenDatasetInput {
  tool_id: string;
  nome: string;
  dominio: DominioDataset;
  versao: string;
  parent_version?: string;
  changelog?: string;
  origem_predominante: string;
}

export interface GoldenCase {
  id: string;
  golden_dataset_id: string;
  input_prompt: string;
  saida_referencia: string;
  contexto_grounding?: Record<string, unknown>;
  rubrica_id?: string;
  criterios_aceitacao?: string;
  dificuldade?: number;
  categoria_risco?: string;
  contem_pii: boolean;
  origem: string;
  citacoes_canonicas?: string[];
}

export interface GoldenCaseInput {
  input_prompt: string;
  saida_referencia: string;
  contexto_grounding?: Record<string, unknown>;
  rubrica_id?: string;
  criterios_aceitacao?: string;
  dificuldade?: number;
  categoria_risco?: string;
  contem_pii: boolean;
  origem: string;
  citacoes_canonicas?: string[];
}

export interface EvalRunInput {
  tool_version_id: string;
  golden_dataset_id: string;
  baseline_run_id?: string;
}

export interface EvalOutput {
  id: string;
  eval_run_id: string;
  golden_case_id: string;
  texto_gerado: string;
  fonte_geracao?: string;
}

export interface EvalOutputInput {
  golden_case_id: string;
  texto_gerado: string;
  fonte_geracao?: string;
}

export interface EvalMetricas {
  [metrica: string]: number;
}

export interface RegressionReport {
  baseline_run_id?: string;
  regrediu: boolean;
  deltas?: Record<string, number>;
  detalhes?: string;
}

export interface EvalRunResult {
  eval_run_id: string;
  metricas: EvalMetricas;
  n_casos: number;
  regression?: RegressionReport;
}

export interface EvalRun {
  id: string;
  tool_version_id: string;
  golden_dataset_id: string;
  baseline_run_id?: string;
  metricas: EvalMetricas;
  n_casos: number;
  outputs: EvalOutput[];
  criado_em?: string;
  regression?: RegressionReport;
}

export type AnnotationLabel = 'aceite' | 'correcao' | 'rejeicao';

export interface Annotation {
  id: string;
  eval_output_id: string;
  label: AnnotationLabel;
  texto_corrigido?: string;
  marcou_alucinacao: boolean;
  justificativa?: string;
  rubric_version?: string;
}

export interface AnnotationInput {
  eval_output_id: string;
  label: AnnotationLabel;
  texto_corrigido?: string;
  marcou_alucinacao: boolean;
  justificativa?: string;
  rubric_version?: string;
}

export interface KpiQuality {
  id: string;
  tool_id: string;
  version_id: string;
  taxa_aceitacao?: number;
  taxa_correcao?: number;
  taxa_alucinacao?: number;
  edit_distance_medio?: number;
  n_amostras?: number;
  criado_em?: string;
  [key: string]: unknown;
}

export interface GateCheck {
  metrica: string;
  exigido: number;
  obtido: number;
  passou: boolean;
}

export interface Gate {
  id: string;
  version_id: string;
  eval_run_id: string;
  metricas_exigidas: Record<string, number>;
  aprovado_automatico: boolean;
  decisao?: 'aprovado' | 'reprovado' | null;
  justificativa?: string;
  checks: GateCheck[];
}

export interface GateInput {
  eval_run_id: string;
  metricas_exigidas: Record<string, number>;
}

export interface GateDecisionInput {
  aprovar: boolean;
  justificativa: string;
}

// ---------- Governança ----------
export interface AuditLogEntry {
  id: string;
  entidade: string;
  entidade_id: string;
  acao: string;
  ator_sub?: string;
  ator_nome?: string;
  hash_atual?: string;
  hash_anterior?: string;
  ocorrido_em: string;
  detalhes?: Record<string, unknown>;
}

export interface AuditVerifyResult {
  total: number;
  intacta: boolean;
  quebras: { id: string; motivo?: string }[];
}

export interface RoleAssignmentInput {
  user_sub: string;
  role: Role;
  tool_id?: string;
  via_delegacao: boolean;
  delegado_por_sub?: string;
  vigencia_fim?: string;
}

export interface RoleAssignment {
  id: string;
  user_sub: string;
  role: Role;
  tool_id?: string;
  via_delegacao: boolean;
  delegado_por_sub?: string;
  vigencia_fim?: string;
  criado_em?: string;
}
