/*
 * /cockpit — Central de pendências do comitê (#13).
 * Agrega o que pede ação humana: gates a homologar, revisões periódicas a vencer
 * (#2, com "registrar revisão"), RIPD/AIA pendente, incidentes, comentários
 * abertos e iniciativas atrasadas. Tudo reusa dados já existentes.
 */

import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useCockpit, useRegistrarRevisao } from '../../lib/queries';
import { api } from '../../lib/api';
import {
  Badge,
  Card,
  EmptyState,
  ErrorAlert,
  Loading,
  Markdown,
  PageHeader,
} from '../../components/ui';

function proximaRevisaoISO(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function KpiMini({ label, valor, tone }: { label: string; valor: number; tone: boolean }): ReactNode {
  return (
    <div
      style={{
        background: 'var(--gd-color-bg-subtle, #efe9dc)',
        borderRadius: 8,
        padding: '0.75rem 1rem',
      }}
    >
      <div style={{ fontSize: '0.8rem', color: 'var(--gd-color-text-muted)' }}>{label}</div>
      <div
        style={{
          fontSize: '1.6rem',
          fontWeight: 600,
          color: valor > 0 && tone ? 'var(--gd-color-danger, #a31621)' : 'var(--gd-color-text)',
        }}
      >
        {valor}
      </div>
    </div>
  );
}

const ulStyle = { listStyle: 'none', padding: 0, margin: 0 } as const;
const liStyle = {
  padding: '0.5rem 0',
  borderBottom: '1px solid var(--gd-color-border)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flexWrap: 'wrap' as const,
};

export function CockpitPage(): ReactNode {
  const { data, isLoading, isError, error } = useCockpit();
  const registrar = useRegistrarRevisao();
  const briefing = useMutation({ mutationFn: () => api.briefingReuniao() });

  if (isLoading) return <Loading label="Carregando pendências…" />;
  if (isError) return <ErrorAlert error={error} />;
  if (!data) return null;

  const c = data.contadores;
  const total = c.gates + c.revisoes + c.ripd + c.incidentes + c.comentarios + c.iniciativas;

  return (
    <>
      <PageHeader
        title="Cockpit de pendências"
        description="O que pede ação do comitê: gates a homologar, revisões a vencer, RIPD/AIA pendente, incidentes, comentários e prazos."
        actions={
          <button
            type="button"
            className="gd-btn gd-btn--secondary gd-btn--sm"
            onClick={() => briefing.mutate()}
            disabled={briefing.isPending}
          >
            {briefing.isPending ? 'Gerando…' : 'Gerar pauta da reunião (IA)'}
          </button>
        }
      />

      {briefing.isPending && <Loading label="Montando a pauta… (pode levar até 30s)" />}
      {briefing.isError && <ErrorAlert error={briefing.error} />}
      {briefing.data && (
        <Card title="Pauta da reunião (IA)">
          <div className="gd-md--panel">
            <Markdown text={briefing.data.pauta} />
          </div>
          <p
            style={{
              fontSize: 'var(--gd-font-size-xs)',
              color: 'var(--gd-color-text-muted)',
              marginBottom: 0,
            }}
          >
            Pauta gerada por IA a partir do estado atual — revise antes de usar.
          </p>
        </Card>
      )}

      <div className="gd-form-grid" style={{ marginBottom: 'var(--gd-space-4)' }}>
        <KpiMini label="Gates a homologar" valor={c.gates} tone={false} />
        <KpiMini label="Revisões (≤30d/vencidas)" valor={c.revisoes} tone />
        <KpiMini label="RIPD/AIA pendente" valor={c.ripd} tone />
        <KpiMini label="Incidentes" valor={c.incidentes} tone />
        <KpiMini label="Comentários abertos" valor={c.comentarios} tone={false} />
        <KpiMini label="Iniciativas atrasadas" valor={c.iniciativas} tone />
      </div>

      {total === 0 && (
        <Card>
          <EmptyState>Sem pendências no momento — comitê em dia.</EmptyState>
        </Card>
      )}

      <Card title={`Gates aguardando homologação (${c.gates})`}>
        {data.gates_aguardando.length === 0 ? (
          <EmptyState>Nenhum gate aguardando decisão.</EmptyState>
        ) : (
          <ul style={ulStyle}>
            {data.gates_aguardando.map((g) => (
              <li key={g.gate_id} style={liStyle}>
                <strong>{g.tool_nome}</strong>
                <span className="gd-mono" style={{ fontSize: '0.8rem' }}>
                  versão {g.versao}
                </span>
                <Link to="/gate" style={{ marginLeft: 'auto' }}>
                  Abrir gate
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`Revisões periódicas — vencidas ou a vencer (${c.revisoes})`}>
        {data.revisoes.length === 0 ? (
          <EmptyState>Nenhuma revisão próxima.</EmptyState>
        ) : (
          <ul style={ulStyle}>
            {data.revisoes.map((r) => (
              <li key={r.tool_id} style={liStyle}>
                <Badge tone={r.vencida ? 'danger' : 'warning'}>
                  {r.vencida ? 'vencida' : 'a vencer'}
                </Badge>
                <Link to={`/ferramentas/${r.tool_id}`}>{r.nome}</Link>
                <span className="gd-mono" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                  {r.codigo} · {r.proxima_revisao_em}
                </span>
                <button
                  type="button"
                  className="gd-btn gd-btn--secondary gd-btn--sm"
                  style={{ marginLeft: 'auto' }}
                  disabled={registrar.isPending}
                  onClick={() => registrar.mutate({ id: r.tool_id, proxima: proximaRevisaoISO() })}
                >
                  Registrar revisão (+12m)
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`RIPD/AIA pendente (${c.ripd})`}>
        {data.ripd_pendente.length === 0 ? (
          <EmptyState>Nenhum RIPD/AIA pendente.</EmptyState>
        ) : (
          <ul style={ulStyle}>
            {data.ripd_pendente.map((t) => (
              <li key={t.tool_id} style={liStyle}>
                <Link to={`/ferramentas/${t.tool_id}`}>{t.nome}</Link>
                <span className="gd-mono" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                  {t.codigo}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`Incidentes em aberto (${c.incidentes})`}>
        {data.incidentes_abertos.length === 0 ? (
          <EmptyState>Nenhum incidente em aberto.</EmptyState>
        ) : (
          <ul style={ulStyle}>
            {data.incidentes_abertos.map((i) => (
              <li key={i.id} style={liStyle}>
                <Badge tone="danger">72h</Badge>
                <strong>{i.tool_nome}</strong>
                <span className="gd-mono" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                  {i.identificado_em ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`Comentários não resolvidos (${c.comentarios})`}>
        {data.comentarios_abertos.length === 0 ? (
          <EmptyState>Nenhum comentário em aberto.</EmptyState>
        ) : (
          <ul style={ulStyle}>
            {data.comentarios_abertos.map((cm, i) => (
              <li key={i} style={liStyle}>
                <Link to="/painel">{cm.iniciativa_titulo}</Link>
                <span style={{ color: 'var(--gd-color-text-muted)' }}>
                  {cm.texto.length > 80 ? `${cm.texto.slice(0, 80)}…` : cm.texto}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`Iniciativas atrasadas (${c.iniciativas})`}>
        {data.iniciativas_atrasadas.length === 0 ? (
          <EmptyState>Nenhuma iniciativa atrasada.</EmptyState>
        ) : (
          <ul style={ulStyle}>
            {data.iniciativas_atrasadas.map((it) => (
              <li key={it.id} style={liStyle}>
                <Badge tone="danger">atrasada</Badge>
                <Link to="/painel">{it.titulo}</Link>
                <span className="gd-mono" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                  {it.prazo} · {it.responsavel_nome ?? 'sem responsável'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
