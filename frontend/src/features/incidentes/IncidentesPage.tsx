/*
 * /incidentes — Gestão de incidentes (#1, CNJ 615 Art. 42, SLA 72h).
 * Registrar evento adverso (causa, medida), com cronômetro regressivo de 72h a
 * partir da identificação; marcar o cumprimento do prazo.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth, hasAnyRole } from '../../lib/auth-oidc';
import {
  useCreateIncidente,
  useIncidentes,
  useTools,
  useUpdateIncidente,
} from '../../lib/queries';
import {
  Badge,
  Card,
  CheckboxField,
  EmptyState,
  ErrorAlert,
  Loading,
  PageHeader,
  SelectField,
  TextAreaField,
  TextField,
} from '../../components/ui';
import type { Incidente } from '../../lib/types';

function nowLocal(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function prazo72(
  ident: string,
  cumprido: boolean | null,
): { tone: 'success' | 'warning' | 'danger'; label: string } {
  if (cumprido) return { tone: 'success', label: '72h cumprido' };
  const limite = new Date(ident).getTime() + 72 * 3600 * 1000;
  const restanteH = Math.round((limite - Date.now()) / 3600000);
  if (restanteH < 0) return { tone: 'danger', label: `72h vencido (há ${-restanteH}h)` };
  return { tone: 'warning', label: `${restanteH}h restantes` };
}

function IncidenteForm({ onDone }: { onDone: () => void }): ReactNode {
  const create = useCreateIncidente();
  const { data: tools } = useTools();
  const [toolId, setToolId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [identificado, setIdentificado] = useState(nowLocal());
  const [causa, setCausa] = useState('');
  const [medida, setMedida] = useState('');
  const [comunicado, setComunicado] = useState('');
  const [cumprido, setCumprido] = useState(false);

  function onSubmit(e: FormEvent): void {
    e.preventDefault();
    create.mutate(
      {
        tool_id: toolId,
        descricao_evento: descricao.trim(),
        identificado_em: identificado,
        causa: causa.trim() || null,
        medida_correcao: medida.trim() || null,
        comunicado_em: comunicado || null,
        prazo_72h_cumprido: cumprido,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {create.isError && <ErrorAlert error={create.error} />}
      <div className="gd-form-grid">
        <SelectField
          label="Ferramenta"
          required
          value={toolId}
          onChange={setToolId}
          placeholder="Selecione…"
          options={(tools ?? []).map((t) => ({ value: t.id, label: `${t.codigo_institucional} — ${t.nome}` }))}
        />
        <TextField label="Identificado em" type="datetime-local" value={identificado} onChange={setIdentificado} />
        <TextField label="Comunicado em" type="datetime-local" value={comunicado} onChange={setComunicado} />
      </div>
      <TextAreaField label="Descrição do evento" required value={descricao} onChange={setDescricao} rows={3} />
      <TextAreaField label="Causa" value={causa} onChange={setCausa} rows={2} />
      <TextAreaField label="Medida de correção" value={medida} onChange={setMedida} rows={2} />
      <CheckboxField label="Prazo de 72h cumprido" checked={cumprido} onChange={setCumprido} />
      <button type="submit" className="gd-btn" disabled={create.isPending || !toolId || !descricao.trim()}>
        {create.isPending ? 'Registrando…' : 'Registrar incidente'}
      </button>
    </form>
  );
}

export function IncidentesPage(): ReactNode {
  const { user } = useAuth();
  const podeEditar = hasAnyRole(user, 'owner_ferramenta', 'coordenador_comite', 'admin');
  const { data, isLoading, isError, error } = useIncidentes();
  const update = useUpdateIncidente();
  const [criando, setCriando] = useState(false);

  return (
    <>
      <PageHeader
        title="Incidentes"
        description="Eventos adversos com IA — registro e cronômetro de 72h (CNJ 615, Art. 42)."
        actions={
          podeEditar && (
            <button type="button" className="gd-btn" onClick={() => setCriando((v) => !v)}>
              {criando ? 'Fechar' : 'Registrar incidente'}
            </button>
          )
        }
      />

      {criando && podeEditar && (
        <Card title="Novo incidente">
          <IncidenteForm onDone={() => setCriando(false)} />
        </Card>
      )}

      <Card title="Incidentes registrados">
        {isLoading && <Loading label="Carregando…" />}
        {isError && <ErrorAlert error={error} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && (
          <EmptyState>Nenhum incidente registrado.</EmptyState>
        )}
        {data && data.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.map((i: Incidente) => {
              const p = prazo72(i.identificado_em, i.prazo_72h_cumprido);
              return (
                <li
                  key={i.id}
                  style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--gd-color-border)' }}
                >
                  <div className="gd-row" style={{ alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Badge tone={p.tone}>{p.label}</Badge>
                    <strong>{i.tool_nome}</strong>
                    <span className="gd-mono" style={{ fontSize: '0.78rem', opacity: 0.7 }}>
                      {i.tool_codigo}
                    </span>
                    {podeEditar && !i.prazo_72h_cumprido && (
                      <button
                        type="button"
                        className="gd-btn gd-btn--secondary gd-btn--sm"
                        style={{ marginLeft: 'auto' }}
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: i.id, input: { prazo_72h_cumprido: true } })}
                      >
                        Marcar 72h cumprido
                      </button>
                    )}
                  </div>
                  <p style={{ margin: '0.35rem 0 0' }}>{i.descricao_evento}</p>
                  {i.medida_correcao && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--gd-color-text-muted)' }}>
                      Medida: {i.medida_correcao}
                    </p>
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
