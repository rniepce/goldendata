/*
 * /encaminhamentos — Compromissos com responsável e prazo (#42).
 * Fecha o ciclo deliberação→ação: criar, listar (filtro por responsável),
 * marcar como feito; prazos vencidos destacados.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth, hasAnyRole } from '../../lib/auth-oidc';
import {
  useCreateEncaminhamento,
  useEncaminhamentos,
  useUpdateEncaminhamento,
} from '../../lib/queries';
import {
  Badge,
  Card,
  EmptyState,
  ErrorAlert,
  Loading,
  PageHeader,
  SelectField,
  TextField,
} from '../../components/ui';
import { MEMBROS_GEXIA, corMembro } from '../../lib/options';
import { iniciais } from '../painel/avatar';
import type { Encaminhamento } from '../../lib/types';

const RESP_OPTIONS = [
  { value: '', label: 'Sem responsável' },
  ...MEMBROS_GEXIA.map((m) => ({ value: m.email, label: m.nome })),
];

function vencido(prazo: string | null): boolean {
  if (!prazo) return false;
  const d = new Date(prazo + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return d < hoje;
}

function EncForm({ onDone }: { onDone: () => void }): ReactNode {
  const create = useCreateEncaminhamento();
  const [descricao, setDescricao] = useState('');
  const [respEmail, setRespEmail] = useState('');
  const [prazo, setPrazo] = useState('');
  const [origem, setOrigem] = useState('');

  function onSubmit(e: FormEvent): void {
    e.preventDefault();
    const nome = MEMBROS_GEXIA.find((m) => m.email === respEmail)?.nome ?? null;
    create.mutate(
      {
        descricao: descricao.trim(),
        responsavel_email: respEmail || null,
        responsavel_nome: nome,
        prazo: prazo || null,
        origem: origem.trim() || null,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {create.isError && <ErrorAlert error={create.error} />}
      <TextField label="Descrição do encaminhamento" required value={descricao} onChange={setDescricao} />
      <div className="gd-form-grid">
        <SelectField label="Responsável" value={respEmail} onChange={setRespEmail} options={RESP_OPTIONS} />
        <TextField label="Prazo" type="date" value={prazo} onChange={setPrazo} />
        <TextField label="Origem" value={origem} onChange={setOrigem} hint="Ex.: Reunião 12/06, Deliberação 003" />
      </div>
      <button type="submit" className="gd-btn" disabled={create.isPending || !descricao.trim()}>
        {create.isPending ? 'Criando…' : 'Criar encaminhamento'}
      </button>
    </form>
  );
}

export function EncaminhamentosPage(): ReactNode {
  const { user } = useAuth();
  const podeEditar = hasAnyRole(user, 'owner_ferramenta', 'coordenador_comite', 'admin');
  const [filtro, setFiltro] = useState('');
  const { data, isLoading, isError, error } = useEncaminhamentos(
    filtro ? { responsavel: filtro } : undefined,
  );
  const update = useUpdateEncaminhamento();
  const [criando, setCriando] = useState(false);

  return (
    <>
      <PageHeader
        title="Encaminhamentos"
        description="Compromissos com responsável e prazo — o que ficou de ser feito."
        actions={
          podeEditar && (
            <button type="button" className="gd-btn" onClick={() => setCriando((v) => !v)}>
              {criando ? 'Fechar' : 'Novo encaminhamento'}
            </button>
          )
        }
      />

      {criando && podeEditar && (
        <Card title="Novo encaminhamento">
          <EncForm onDone={() => setCriando(false)} />
        </Card>
      )}

      <Card title="Lista">
        <div style={{ maxWidth: 280, marginBottom: '1rem' }}>
          <SelectField
            label="Filtrar por responsável"
            value={filtro}
            onChange={setFiltro}
            placeholder="Todos"
            options={MEMBROS_GEXIA.map((m) => ({ value: m.email, label: m.nome }))}
          />
        </div>
        {isLoading && <Loading label="Carregando…" />}
        {isError && <ErrorAlert error={error} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && (
          <EmptyState>Nenhum encaminhamento.</EmptyState>
        )}
        {data && data.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.map((e: Encaminhamento) => {
              const atrasado = e.status === 'aberto' && vencido(e.prazo);
              return (
                <li
                  key={e.id}
                  style={{
                    padding: '0.6rem 0',
                    borderBottom: '1px solid var(--gd-color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <Badge tone={e.status === 'feito' ? 'success' : atrasado ? 'danger' : 'info'}>
                    {e.status === 'feito' ? 'feito' : atrasado ? 'atrasado' : 'aberto'}
                  </Badge>
                  {e.responsavel_email && (
                    <span
                      className="painel-avatar"
                      style={{ background: corMembro(e.responsavel_email) }}
                      title={e.responsavel_nome ?? undefined}
                    >
                      {iniciais(e.responsavel_nome)}
                    </span>
                  )}
                  <span>{e.descricao}</span>
                  <span className="gd-mono" style={{ fontSize: '0.78rem', opacity: 0.7 }}>
                    {e.prazo ?? 'sem prazo'}
                    {e.origem ? ` · ${e.origem}` : ''}
                  </span>
                  {podeEditar && e.status === 'aberto' && (
                    <button
                      type="button"
                      className="gd-btn gd-btn--secondary gd-btn--sm"
                      style={{ marginLeft: 'auto' }}
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: e.id, input: { status: 'feito' } })}
                    >
                      Marcar feito
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
