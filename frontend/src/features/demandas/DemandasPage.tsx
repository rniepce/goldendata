/*
 * /demandas — Balcão de demandas das unidades (#37).
 * Porta de entrada formal: registrar uma demanda e fazer a triagem
 * (aceitar → vira iniciativa / recusar / devolver), com motivo registrado.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, hasAnyRole } from '../../lib/auth-oidc';
import { useCreateDemanda, useDemandas, useTriarDemanda } from '../../lib/queries';
import {
  Badge,
  Card,
  EmptyState,
  ErrorAlert,
  Loading,
  PageHeader,
  SelectField,
  TextAreaField,
  TextField,
} from '../../components/ui';
import { CATEGORIA_OPTIONS } from '../../lib/options';
import type { Demanda, DemandaStatus } from '../../lib/types';

const STATUS: Record<DemandaStatus, { tone: 'neutral' | 'info' | 'success' | 'danger' | 'warning'; label: string }> = {
  nova: { tone: 'info', label: 'Nova' },
  em_triagem: { tone: 'warning', label: 'Em triagem' },
  aceita: { tone: 'success', label: 'Aceita' },
  recusada: { tone: 'danger', label: 'Recusada' },
  devolvida: { tone: 'warning', label: 'Devolvida' },
};

function DemandaForm({ onDone }: { onDone: () => void }): ReactNode {
  const create = useCreateDemanda();
  const [unidade, setUnidade] = useState('');
  const [titulo, setTitulo] = useState('');
  const [problema, setProblema] = useState('');
  const [sei, setSei] = useState('');
  const [risco, setRisco] = useState('');

  function onSubmit(e: FormEvent): void {
    e.preventDefault();
    create.mutate(
      {
        unidade_demandante: unidade.trim(),
        titulo: titulo.trim(),
        problema: problema.trim() || null,
        processo_sei: sei.trim() || null,
        classificacao_risco_preliminar: risco.trim() || null,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {create.isError && <ErrorAlert error={create.error} />}
      <div className="gd-form-grid">
        <TextField label="Unidade demandante" required value={unidade} onChange={setUnidade} />
        <TextField label="Título" required value={titulo} onChange={setTitulo} />
        <TextField label="Processo SEI" value={sei} onChange={setSei} />
        <TextField label="Risco preliminar" value={risco} onChange={setRisco} hint="Ex.: AR3 / alto / a confirmar" />
      </div>
      <TextAreaField label="Problema / necessidade" value={problema} onChange={setProblema} rows={4} />
      <button type="submit" className="gd-btn" disabled={create.isPending || !unidade.trim() || !titulo.trim()}>
        {create.isPending ? 'Registrando…' : 'Registrar demanda'}
      </button>
    </form>
  );
}

function TriagemControls({ demanda }: { demanda: Demanda }): ReactNode {
  const triar = useTriarDemanda();
  const [modo, setModo] = useState<'' | 'aceitar' | 'recusar' | 'devolver'>('');
  const [categoria, setCategoria] = useState('suporte');
  const [motivo, setMotivo] = useState('');

  function confirmar(): void {
    if (modo === 'aceitar') {
      triar.mutate({ id: demanda.id, input: { acao: 'aceitar', categoria } }, { onSuccess: () => setModo('') });
    } else if (modo) {
      triar.mutate({ id: demanda.id, input: { acao: modo, motivo: motivo.trim() || null } }, { onSuccess: () => setModo('') });
    }
  }

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {modo === '' ? (
        <div className="gd-row">
          <button type="button" className="gd-btn gd-btn--sm" onClick={() => setModo('aceitar')}>Aceitar</button>
          <button type="button" className="gd-btn gd-btn--secondary gd-btn--sm" onClick={() => setModo('devolver')}>Devolver</button>
          <button type="button" className="gd-btn gd-btn--text gd-btn--sm" onClick={() => setModo('recusar')}>Recusar</button>
        </div>
      ) : (
        <div className="gd-row" style={{ flexWrap: 'wrap', alignItems: 'flex-end', gap: '0.5rem' }}>
          {modo === 'aceitar' ? (
            <div style={{ minWidth: 200 }}>
              <SelectField label="Categoria da iniciativa" value={categoria} onChange={setCategoria} options={CATEGORIA_OPTIONS} />
            </div>
          ) : (
            <div style={{ minWidth: 240, flex: 1 }}>
              <TextField label={modo === 'recusar' ? 'Motivo da recusa' : 'O que falta (devolução)'} value={motivo} onChange={setMotivo} />
            </div>
          )}
          <button type="button" className="gd-btn gd-btn--sm" onClick={confirmar} disabled={triar.isPending}>
            Confirmar {modo}
          </button>
          <button type="button" className="gd-btn gd-btn--text gd-btn--sm" onClick={() => setModo('')}>Cancelar</button>
        </div>
      )}
      {triar.isError && <ErrorAlert error={triar.error} />}
    </div>
  );
}

export function DemandasPage(): ReactNode {
  const { user } = useAuth();
  const podeTriar = hasAnyRole(user, 'coordenador_comite', 'admin');
  const podeCriar = hasAnyRole(user, 'owner_ferramenta', 'coordenador_comite', 'avaliador', 'admin');
  const { data, isLoading, isError, error } = useDemandas();
  const [criando, setCriando] = useState(false);

  const acionavel = (s: DemandaStatus): boolean => s === 'nova' || s === 'em_triagem' || s === 'devolvida';

  return (
    <>
      <PageHeader
        title="Balcão de demandas"
        description="Porta de entrada formal das unidades. A triagem aceita (vira iniciativa), recusa ou devolve para mais informações."
        actions={
          podeCriar && (
            <button type="button" className="gd-btn" onClick={() => setCriando((v) => !v)}>
              {criando ? 'Fechar' : 'Nova demanda'}
            </button>
          )
        }
      />

      {criando && podeCriar && (
        <Card title="Nova demanda">
          <DemandaForm onDone={() => setCriando(false)} />
        </Card>
      )}

      <Card title="Demandas">
        {isLoading && <Loading label="Carregando demandas…" />}
        {isError && <ErrorAlert error={error} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && (
          <EmptyState>Nenhuma demanda registrada.</EmptyState>
        )}
        {data && data.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.map((d) => (
              <li
                key={d.id}
                style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--gd-color-border)' }}
              >
                <div className="gd-row" style={{ alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Badge tone={STATUS[d.status].tone}>{STATUS[d.status].label}</Badge>
                  <strong>{d.titulo}</strong>
                  <span className="gd-mono" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    {d.unidade_demandante}
                    {d.processo_sei ? ` · SEI ${d.processo_sei}` : ''}
                  </span>
                  {d.iniciativa_id && (
                    <Link to="/painel" style={{ marginLeft: 'auto' }}>
                      ver iniciativa
                    </Link>
                  )}
                </div>
                {d.problema && (
                  <p style={{ margin: '0.35rem 0 0', color: 'var(--gd-color-text-muted)' }}>{d.problema}</p>
                )}
                {d.motivo && (
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>Motivo: {d.motivo}</p>
                )}
                {podeTriar && acionavel(d.status) && <TriagemControls demanda={d} />}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
