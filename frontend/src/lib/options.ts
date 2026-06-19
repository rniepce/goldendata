/*
 * Opções de domínio reutilizadas em formulários (rótulos pt-BR).
 */

import type { SelectOption } from '../components/ui';
import type { IniciativaCategoria, IniciativaStatus, IniciativaPrioridade } from './types';

export const HOSPEDAGEM_OPTIONS: SelectOption[] = [
  { value: 'api_externa', label: 'API externa' },
  { value: 'on_premise', label: 'On-premise' },
  { value: 'nuvem_homologada', label: 'Nuvem homologada' },
];

export const TIPO_OPTIONS: SelectOption[] = [
  { value: 'ferramenta', label: 'Ferramenta' },
  { value: 'agente', label: 'Agente' },
];

export const RISCO_OPTIONS: SelectOption[] = [
  { value: 'baixo', label: 'Baixo' },
  { value: 'alto', label: 'Alto' },
];

export const NATUREZA_DADO_OPTIONS: SelectOption[] = [
  { value: 'treino_finetuning', label: 'Treino / fine-tuning' },
  { value: 'rag_base', label: 'Base RAG' },
  { value: 'contexto_runtime', label: 'Contexto em runtime' },
];

export const BASE_LEGAL_OPTIONS: SelectOption[] = [
  { value: 'funcao_jurisdicional', label: 'Função jurisdicional' },
  { value: 'obrigacao_legal', label: 'Obrigação legal' },
  { value: 'politica_publica', label: 'Política pública' },
  { value: 'legitimo_interesse', label: 'Legítimo interesse' },
  { value: 'consentimento', label: 'Consentimento' },
  { value: 'nao_se_aplica', label: 'Não se aplica' },
];

export const ESCALA_RUBRICA_OPTIONS: SelectOption[] = [
  { value: 'binaria', label: 'Binária' },
  { value: 'escala_3', label: 'Escala 3 pontos' },
  { value: 'escala_5', label: 'Escala 5 pontos' },
];

export const DOMINIO_DATASET_OPTIONS: SelectOption[] = [
  { value: 'minuta', label: 'Minuta' },
  { value: 'despacho', label: 'Despacho' },
  { value: 'decisao', label: 'Decisão' },
  { value: 'relatorio', label: 'Relatório' },
  { value: 'sentenca', label: 'Sentença' },
  { value: 'outro', label: 'Outro' },
];

export const ANNOTATION_LABEL_OPTIONS: SelectOption[] = [
  { value: 'aceite', label: 'Aceite' },
  { value: 'correcao', label: 'Correção' },
  { value: 'rejeicao', label: 'Rejeição' },
];

export const ROLE_OPTIONS: SelectOption[] = [
  { value: 'coordenador_comite', label: 'Coordenador do Comitê' },
  { value: 'owner_ferramenta', label: 'Owner de ferramenta' },
  { value: 'avaliador', label: 'Avaliador' },
  { value: 'auditor_dpo', label: 'Auditor / DPO' },
  { value: 'admin', label: 'Administrador' },
];

/** Checklist de vedações (uso institucional) para a ficha técnica. */
export const VEDACOES_ITENS: { chave: string; rotulo: string }[] = [
  { chave: 'decisao_autonoma', rotulo: 'Veda decisão autônoma sem revisão humana' },
  { chave: 'dados_sensiveis_sem_base', rotulo: 'Veda uso de dados sensíveis sem base legal' },
  { chave: 'conteudo_nao_jurisdicional', rotulo: 'Veda uso fora da função jurisdicional' },
  { chave: 'treino_com_sigilo', rotulo: 'Veda treino com dados sob sigilo' },
];

// ---------- Iniciativas do GEX-IA (Painel) ----------
type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const CATEGORIA_META: Record<
  IniciativaCategoria,
  { label: string; tone: BadgeTone; cor: string }
> = {
  solucao_ia: { label: 'Solução de IA', tone: 'info', cor: '#2563eb' },
  educacional: { label: 'Educacional', tone: 'success', cor: '#059669' },
  suporte: { label: 'Suporte', tone: 'warning', cor: '#d97706' },
  governanca_normativo: { label: 'Governança & Normativo', tone: 'neutral', cor: '#4f46e5' },
  cooperacao: { label: 'Cooperação', tone: 'info', cor: '#0d9488' },
  pesquisa_prospeccao: { label: 'Pesquisa & Prospecção', tone: 'neutral', cor: '#9333ea' },
};

export const STATUS_META: Record<IniciativaStatus, { label: string; tone: BadgeTone }> = {
  a_fazer: { label: 'A fazer', tone: 'neutral' },
  em_andamento: { label: 'Em andamento', tone: 'info' },
  em_pausa: { label: 'Em pausa', tone: 'warning' },
  concluido: { label: 'Concluído', tone: 'success' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
};

export const PRIORIDADE_META: Record<
  IniciativaPrioridade,
  { label: string; tone: BadgeTone; cor: string }
> = {
  baixa: { label: 'Baixa', tone: 'neutral', cor: '#16a34a' },
  media: { label: 'Média', tone: 'info', cor: '#d97706' },
  alta: { label: 'Alta', tone: 'danger', cor: '#dc2626' },
};

export const CATEGORIA_OPTIONS: SelectOption[] = (
  Object.keys(CATEGORIA_META) as IniciativaCategoria[]
).map((k) => ({ value: k, label: CATEGORIA_META[k].label }));

export const STATUS_INICIATIVA_OPTIONS: SelectOption[] = (
  Object.keys(STATUS_META) as IniciativaStatus[]
).map((k) => ({ value: k, label: STATUS_META[k].label }));

export const PRIORIDADE_OPTIONS: SelectOption[] = (
  Object.keys(PRIORIDADE_META) as IniciativaPrioridade[]
).map((k) => ({ value: k, label: PRIORIDADE_META[k].label }));

/** Ordem das categorias e status nas visões do painel. */
export const CATEGORIA_ORDEM: IniciativaCategoria[] = [
  'solucao_ia', 'educacional', 'suporte', 'governanca_normativo', 'cooperacao', 'pesquisa_prospeccao',
];
export const STATUS_ORDEM: IniciativaStatus[] = [
  'a_fazer', 'em_andamento', 'em_pausa', 'concluido', 'cancelado',
];

/** Equipe atual do GEX-IA (para o seletor de responsável nas iniciativas). */
export const MEMBROS_GEXIA: { email: string; nome: string }[] = [
  { email: 'rafael.pimentel@tjmg.jus.br', nome: 'Rafael Niepce Verona Pimentel' },
  { email: 'victor.leal@tjmg.jus.br', nome: 'Victor Moreira Mulin Leal' },
  { email: 'gustavo.soares@tjmg.jus.br', nome: 'Gustavo Resende Queiroz Soares' },
  { email: 'erika.porto@tjmg.jus.br', nome: 'Érika Porto' },
  { email: 'urick.teixeira@tjmg.jus.br', nome: 'Urick Alberth' },
  { email: 'isabella.andrade@tjmg.jus.br', nome: 'Isabella Andrade' },
];
