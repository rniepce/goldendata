/*
 * /admin — atribuição de papéis (RBAC) e delegação de autorizações com vigência.
 * Diretriz CESEC: distinguir autorização direta vs. por delegação, com vigência.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../../lib/auth-oidc';
import { useTools, useCreateRoleAssignment } from '../../lib/queries';
import {
  Card,
  CheckboxField,
  ErrorAlert,
  InfoAlert,
  PageHeader,
  SelectField,
  SuccessAlert,
  TextField,
} from '../../components/ui';
import { ROLE_OPTIONS } from '../../lib/options';
import type { Role, RoleAssignmentInput } from '../../lib/types';
import { env } from '../../lib/env';
import { UserManagement } from './UserManagement';

export function AdminPage(): ReactNode {
  const { user } = useAuth();
  const { data: tools } = useTools();
  const mutation = useCreateRoleAssignment();

  const [userSub, setUserSub] = useState('');
  const [role, setRole] = useState<Role>('avaliador');
  const [toolId, setToolId] = useState('');
  const [viaDelegacao, setViaDelegacao] = useState(false);
  const [delegadoPor, setDelegadoPor] = useState('');
  const [vigenciaFim, setVigenciaFim] = useState('');

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const input: RoleAssignmentInput = {
      user_sub: userSub.trim(),
      role,
      tool_id: toolId || undefined,
      via_delegacao: viaDelegacao,
      delegado_por_sub: viaDelegacao ? delegadoPor.trim() || user?.sub : undefined,
      vigencia_fim: vigenciaFim || undefined,
    };
    mutation.mutate(input, {
      onSuccess: () => {
        setUserSub('');
        setVigenciaFim('');
      },
    });
  }

  return (
    <>
      <PageHeader
        title="Administração"
        description="Gestão de usuários (logins) e atribuição de papéis (RBAC)."
      />

      {env.authMode === 'supabase' && (
        <div style={{ marginBottom: 'var(--gd-space-5)' }}>
          <UserManagement />
        </div>
      )}

      <InfoAlert>
        A atribuição direta concede o papel ao usuário. A delegação registra que outro titular
        delegou a autorização, com data de fim de vigência para revisão periódica.
      </InfoAlert>

      <Card title="Atribuir / delegar papel">
        <form onSubmit={handleSubmit} noValidate>
          {mutation.isError && <ErrorAlert error={mutation.error} />}
          {mutation.isSuccess && <SuccessAlert>Atribuição registrada.</SuccessAlert>}

          <div className="gd-form-grid">
            <TextField
              label="Identificador do usuário (sub)"
              required
              value={userSub}
              onChange={setUserSub}
              hint="Subject do usuário no Keycloak."
            />
            <SelectField
              label="Papel"
              required
              value={role}
              onChange={(v) => setRole(v as Role)}
              options={ROLE_OPTIONS}
            />
            <SelectField
              label="Ferramenta (escopo)"
              value={toolId}
              onChange={setToolId}
              placeholder="Todas (papel global)"
              options={(tools ?? []).map((t) => ({ value: t.id, label: t.nome }))}
            />
            <TextField
              label="Fim de vigência"
              type="date"
              value={vigenciaFim}
              onChange={setVigenciaFim}
            />
          </div>

          <CheckboxField
            label="Concessão por delegação"
            checked={viaDelegacao}
            onChange={setViaDelegacao}
          />
          {viaDelegacao && (
            <TextField
              label="Delegado por (sub)"
              value={delegadoPor}
              onChange={setDelegadoPor}
              hint={`Em branco, assume o titular atual (${user?.sub ?? '—'}).`}
            />
          )}

          <button type="submit" className="gd-btn" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : 'Registrar atribuição'}
          </button>
        </form>
      </Card>
    </>
  );
}
