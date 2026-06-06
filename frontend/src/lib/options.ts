/*
 * Opções de domínio reutilizadas em formulários (rótulos pt-BR).
 */

import type { SelectOption } from '../components/ui';

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
