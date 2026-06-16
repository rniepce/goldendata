/*
 * Gestão de usuários (Supabase Auth) — criar/listar/remover contas de acesso,
 * com atribuição de papéis (RBAC). Restrito a admin/coordenador.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useUsers, useCreateUser, useDeleteUser } from '../../lib/queries';
import {
  Card,
  CheckboxField,
  ErrorAlert,
  Loading,
  SuccessAlert,
  TextField,
} from '../../components/ui';
import { ROLE_OPTIONS } from '../../lib/options';
import type { Role } from '../../lib/types';

/** Senha temporária forte gerada no cliente (o admin entrega ao usuário). */
function gerarSenha(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return 'Gd-' + Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
}

export function UserManagement(): ReactNode {
  const { data: users, isLoading, isError, error } = useUsers();
  const createMut = useCreateUser();
  const deleteMut = useDeleteUser();

  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState(gerarSenha());
  const [roles, setRoles] = useState<Role[]>(['avaliador']);
  const [criada, setCriada] = useState<{ email: string; senha: string } | null>(null);

  function toggleRole(role: Role, on: boolean): void {
    setRoles((prev) => (on ? [...new Set([...prev, role])] : prev.filter((r) => r !== role)));
  }

  function onSubmit(e: FormEvent): void {
    e.preventDefault();
    if (roles.length === 0) return;
    const senhaUsada = senha;
    createMut.mutate(
      { email: email.trim(), nome: nome.trim(), senha: senhaUsada, roles },
      {
        onSuccess: () => {
          setCriada({ email: email.trim(), senha: senhaUsada });
          setEmail('');
          setNome('');
          setSenha(gerarSenha());
          setRoles(['avaliador']);
        },
      },
    );
  }

  return (
    <Card title="Gestão de usuários (logins)">
      <p style={{ color: 'var(--gd-color-text-muted)', fontSize: 'var(--gd-font-size-sm)', marginTop: 0 }}>
        Crie contas de acesso à plataforma (Supabase Auth) e atribua os papéis. A senha é temporária —
        entregue-a ao usuário, que poderá trocá-la depois.
      </p>

      <form onSubmit={onSubmit} noValidate>
        {createMut.isError && <ErrorAlert error={createMut.error} />}
        {criada && (
          <SuccessAlert>
            Usuário <strong>{criada.email}</strong> criado. Senha temporária:{' '}
            <code className="gd-mono">{criada.senha}</code> — guarde e repasse agora (não será exibida de novo).
          </SuccessAlert>
        )}

        <div className="gd-form-grid">
          <TextField label="E-mail" type="email" required value={email} onChange={setEmail} placeholder="nome@tjmg.jus.br" />
          <TextField label="Nome" required value={nome} onChange={setNome} />
          <TextField label="Senha temporária" required value={senha} onChange={setSenha} hint="Mínimo 8 caracteres. Use o botão para gerar." />
        </div>

        <div style={{ margin: 'var(--gd-space-2) 0' }}>
          <button type="button" className="gd-btn gd-btn--secondary gd-btn--sm" onClick={() => setSenha(gerarSenha())}>
            Gerar nova senha
          </button>
        </div>

        <fieldset style={{ border: '1px solid var(--gd-color-border)', borderRadius: 8, padding: 'var(--gd-space-3)' }}>
          <legend style={{ fontSize: 'var(--gd-font-size-sm)', fontWeight: 600 }}>Papéis</legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--gd-space-3)' }}>
            {ROLE_OPTIONS.map((opt) => (
              <CheckboxField
                key={opt.value}
                label={opt.label}
                checked={roles.includes(opt.value as Role)}
                onChange={(on) => toggleRole(opt.value as Role, on)}
              />
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          className="gd-btn"
          disabled={createMut.isPending || roles.length === 0}
          style={{ marginTop: 'var(--gd-space-3)' }}
        >
          {createMut.isPending ? 'Criando…' : 'Criar usuário'}
        </button>
      </form>

      <h3 style={{ marginTop: 'var(--gd-space-5)' }}>Usuários cadastrados</h3>
      {isLoading && <Loading label="Carregando usuários…" />}
      {isError && <ErrorAlert error={error} />}
      {users && users.length === 0 && <p>Nenhum usuário cadastrado.</p>}
      {users && users.length > 0 && (
        <table className="gd-table">
          <thead>
            <tr>
              <th scope="col">E-mail</th>
              <th scope="col">Nome</th>
              <th scope="col">Papéis</th>
              <th scope="col">Último acesso</th>
              <th scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.nome ?? '—'}</td>
                <td className="gd-mono" style={{ fontSize: '0.8rem' }}>{u.roles.join(', ') || '—'}</td>
                <td>{u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleDateString('pt-BR') : 'nunca'}</td>
                <td>
                  <button
                    type="button"
                    className="gd-btn gd-btn--secondary gd-btn--sm"
                    onClick={() => {
                      if (confirm(`Remover o acesso de ${u.email}?`)) deleteMut.mutate(u.id);
                    }}
                    disabled={deleteMut.isPending}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {(deleteMut.isError || roles.length === 0) && deleteMut.isError && <ErrorAlert error={deleteMut.error} />}
    </Card>
  );
}
