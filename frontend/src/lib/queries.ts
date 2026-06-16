/*
 * Hooks de dados sobre TanStack Query.
 * Centraliza chaves de cache e invalidações para manter consistência.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type {
  AnnotationInput,
  DataInventoryInput,
  EvalOutputInput,
  GateInput,
  GateDecisionInput,
  GoldenCaseInput,
  GoldenDatasetInput,
  ModelBaseInput,
  PromptVersionInput,
  RoleAssignmentInput,
  RubricInput,
  ToolInput,
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
};

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
