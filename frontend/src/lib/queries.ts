/*
 * Hooks de dados sobre TanStack Query.
 * Centraliza chaves de cache e invalidações para manter consistência.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type {
  AnnotationInput,
  DataInventoryInput,
  DocumentoInput,
  EvalOutputInput,
  GateInput,
  GateDecisionInput,
  ComentarioInput,
  GoldenCaseInput,
  GoldenDatasetInput,
  IniciativaInput,
  ModelBaseInput,
  PromptVersionInput,
  RoleAssignmentInput,
  RubricInput,
  ToolInput,
  ToolUpdateInput,
  ToolVersionInput,
} from './types';

export const queryKeys = {
  me: ['me'] as const,
  tools: ['tools'] as const,
  toolFicha: (id: string) => ['toolFicha', id] as const,
  modelBases: ['modelBases'] as const,
  toolKpi: (id: string) => ['toolKpi', id] as const,
  evalRun: (id: string) => ['evalRun', id] as const,
  auditLog: (entidade?: string, entidadeId?: string) =>
    ['auditLog', entidade ?? '', entidadeId ?? ''] as const,
  auditVerify: ['auditVerify'] as const,
  users: ['users'] as const,
  iniciativas: ['iniciativas'] as const,
  iniciativa: (id: string) => ['iniciativa', id] as const,
  comentarios: (id: string) => ['comentarios', id] as const,
  documentos: (tipo?: string, q?: string) => ['documentos', tipo ?? '', q ?? ''] as const,
  documento: (id: string) => ['documento', id] as const,
};

// ---------- Base de conhecimento (RAG) ----------
export function useDocumentos(params?: { tipo?: string; q?: string }) {
  return useQuery({
    queryKey: queryKeys.documentos(params?.tipo, params?.q),
    queryFn: () => api.listDocumentos(params),
  });
}

export function useDocumento(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.documento(id ?? ''),
    queryFn: () => api.getDocumento(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DocumentoInput) => api.createDocumento(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos'] }),
  });
}

export function useUpdateDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<DocumentoInput> }) =>
      api.updateDocumento(id, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['documentos'] });
      qc.invalidateQueries({ queryKey: queryKeys.documento(id) });
    },
  });
}

export function useDeleteDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDocumento(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos'] }),
  });
}

export function useReindexDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.reindexDocumento(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos'] }),
  });
}

export function useComentarios(iniciativaId: string) {
  return useQuery({
    queryKey: queryKeys.comentarios(iniciativaId),
    queryFn: () => api.listComentarios(iniciativaId),
  });
}

export function useAddComentario(iniciativaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ComentarioInput) => api.addComentario(iniciativaId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.comentarios(iniciativaId) }),
  });
}

export function useResolverComentario(iniciativaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolvido }: { id: string; resolvido: boolean }) =>
      api.resolverComentario(id, resolvido),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.comentarios(iniciativaId) }),
  });
}

export function useDeleteComentario(iniciativaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteComentario(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.comentarios(iniciativaId) }),
  });
}

export function useIniciativas() {
  return useQuery({ queryKey: queryKeys.iniciativas, queryFn: () => api.listIniciativas() });
}

export function useCreateIniciativa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createIniciativa,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.iniciativas }),
  });
}

export function useUpdateIniciativa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<IniciativaInput> }) =>
      api.updateIniciativa(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.iniciativas }),
  });
}

export function useDeleteIniciativa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteIniciativa,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.iniciativas }),
  });
}

export function useUsers() {
  return useQuery({ queryKey: queryKeys.users, queryFn: api.listUsers });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users }),
  });
}

export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: api.me });
}

export function useTools() {
  return useQuery({ queryKey: queryKeys.tools, queryFn: api.listTools });
}

export function useModelBases() {
  return useQuery({ queryKey: queryKeys.modelBases, queryFn: api.listModelBases });
}

export function useToolFicha(toolId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.toolFicha(toolId ?? ''),
    queryFn: () => api.getToolFicha(toolId as string),
    enabled: Boolean(toolId),
  });
}

export function useToolKpi(toolId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.toolKpi(toolId ?? ''),
    queryFn: () => api.getToolKpi(toolId as string),
    enabled: Boolean(toolId),
  });
}

export function useEvalRun(runId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.evalRun(runId ?? ''),
    queryFn: () => api.getEvalRun(runId as string),
    enabled: Boolean(runId),
  });
}

export function useCreateTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ToolInput) => api.createTool(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tools }),
  });
}

export function useUpdateTool(toolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ToolUpdateInput) => api.updateTool(toolId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.toolFicha(toolId) });
      qc.invalidateQueries({ queryKey: queryKeys.tools });
    },
  });
}

export function useUpdateToolStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estagio }: { id: string; estagio: string }) =>
      api.updateTool(id, { estagio_gexia: estagio }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tools }),
  });
}

export function useCockpit() {
  return useQuery({ queryKey: ['cockpit'], queryFn: api.cockpit });
}

export function useRegistrarRevisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, proxima }: { id: string; proxima: string }) =>
      api.updateTool(id, { proxima_revisao_em: proxima }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cockpit'] });
      qc.invalidateQueries({ queryKey: queryKeys.tools });
    },
  });
}

export function useCreateModelBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ModelBaseInput) => api.createModelBase(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.modelBases }),
  });
}

export function useCreatePromptVersion(toolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PromptVersionInput) => api.createPromptVersion(toolId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.toolFicha(toolId) }),
  });
}

export function useCreateToolVersion(toolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ToolVersionInput) => api.createToolVersion(toolId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.toolFicha(toolId) }),
  });
}

export function useCreateDataInventory(toolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DataInventoryInput) => api.createDataInventory(toolId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.toolFicha(toolId) }),
  });
}

export function useCreateRubric() {
  return useMutation({ mutationFn: (input: RubricInput) => api.createRubric(input) });
}

export function useCreateGoldenDataset() {
  return useMutation({
    mutationFn: (input: GoldenDatasetInput) => api.createGoldenDataset(input),
  });
}

export function useCreateGoldenCase(datasetId: string) {
  return useMutation({
    mutationFn: (input: GoldenCaseInput) => api.createGoldenCase(datasetId, input),
  });
}

export function useCreateEvalRun() {
  return useMutation({ mutationFn: api.createEvalRun });
}

export function useSubmitEvalOutputs(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (outputs: EvalOutputInput[]) => api.submitEvalOutputs(runId, outputs),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.evalRun(runId) }),
  });
}

export function useCreateAnnotation() {
  return useMutation({ mutationFn: (input: AnnotationInput) => api.createAnnotation(input) });
}

export function useRollupKpi(toolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => api.rollupKpi(toolId, versionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.toolKpi(toolId) }),
  });
}

export function useCreateGate(versionId: string) {
  return useMutation({ mutationFn: (input: GateInput) => api.createGate(versionId, input) });
}

export function useDecideGate(gateId: string) {
  return useMutation({
    mutationFn: (input: GateDecisionInput) => api.decideGate(gateId, input),
  });
}

export function useCreateRoleAssignment() {
  return useMutation({
    mutationFn: (input: RoleAssignmentInput) => api.createRoleAssignment(input),
  });
}
