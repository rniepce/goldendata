/*
 * /deliberacoes — Deliberações formais do GEX-IA com voto nominal (#38).
 * Pauta + relator + voto dos membros (favorável/contrário/abstenção/impedido) +
 * apuração/quórum + encerrar lavrando o resultado.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth, hasAnyRole } from '../../lib/auth-oidc';
import {
  useCreateDeliberacao,
  useDeliberacao,
  useDeliberacoes,
  useEncerrarDeliberacao,
  useRegistrarVoto,
} from '../../lib/queries';
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
import { MEMBROS_GEXIA, corMembro } from '../../lib/options';
import { iniciais } from '../painel/avatar';
import type { VotoValor } from '../../lib/types';

const RELATOR_OPTIONS = [
  { value: '', label: 'Sem relator' },
  ...MEMBROS_GEXIA.map((m) => ({ value: m.email, label: m.nome })),
];

const VOTOS: { valor: VotoValor; label: string; tone: 'success' | 'danger' | 'neutral' | 'warning' }[] = [
  { valor: 'favoravel', label: 'Favorável', tone: 'success' },
  { valor: 'contrario', label: 'Contrário', tone: 'danger' },
  { valor: 'abstencao', label: 'Abstenção', tone: 'neutral' },
  { valor: 'impedido', label: 'Impedido', tone: 'warning' },
];
const VOTO_META = Object.fromEntries(VOTOS.map((v) => [v.valor, v]));

function NovaDeliberacao({ onDone }: { onDone: () => void }): ReactNode {
  const create = useCreateDeliberacao();
  const [titulo, setTitulo] = useState('');
  const [pauta, setPauta] = useState('');
  const [relator, setRelator] = useState('');
  function onSubmit(e: FormEvent): void {
    e.preventDefault();
    create.mutate(
      { titulo: titulo.trim(), pauta: pauta.trim() || null, relator_email: relator || null },
      { onSuccess: onDone },
    );
  }
  return (
    <form onSubmit={onSubmit} noValidate>
      {create.isError && <ErrorAlert error={create.error} />}
      <TextField label="Título" required value={titulo} onChange={setTitulo} />
      <TextAreaField label="Pauta" value={pauta} onChange={setPauta} rows={3} />
      <SelectField label="Relator" value={relator} onChange={setRelator} options={RELATOR_OPTIONS} />
      <button type="submit" className="gd-btn" disabled={create.isPending || !titulo.trim()}>
        {create.isPending ? 'Abrindo…' : 'Abrir deliberação'}
      </button>
    </form>
  );
}

function Detalhe({ id, podeEncerrar }: { id: string; podeEncerrar: boolean }): ReactNode {
  const { data, isLoading, isError, error } = useDeliberacao(id);
  const voto = useRegistrarVoto(id);
  const encerrar = useEncerrarDeliberacao(id);
  const [resultado, setResultado] = useState('');

  if (isLoading) return <Loading label="Carregando deliberação…" />;
  if (isError) return <ErrorAlert error={error} />;
  if (!data) return null;

  const { deliberacao: d, votos, apuracao } = data;
  const aberta = d.status === 'aberta';
  const votoDe = (email: string): VotoValor | undefined =>
    votos.find((v) => v.membro_email === email)?.valor;

  return (
    <Card
      title={d.titulo}
      actions={<Badge tone={aberta ? 'info' : 'neutral'}>{aberta ? 'aberta' : 'encerrada'}</Badge>}
    >
      {d.pauta && <p style={{ marginTop: 0 }}>{d.pauta}</p>}
      <div className="gd-row" style={{ gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {VOTOS.map((v) => (
          <Badge key={v.valor} tone={v.tone}>
            {v.label}: {apuracao[v.valor] ?? 0}
          </Badge>
        ))}
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {MEMBROS_GEXIA.map((m) => {
          const atual = votoDe(m.email);
          return (
            <li
              key={m.email}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flexWrap: 'wrap',
                padding: '0.4rem 0',
                borderBottom: '1px solid var(--gd-color-border)',
              }}
            >
              <span className="painel-avatar" style={{ background: corMembro(m.email) }}>
                {iniciais(m.nome)}
              </span>
              <span style={{ minWidth: 120 }}>{m.nome.split(' ')[0]}</span>
              {atual && <Badge tone={VOTO_META[atual].tone}>{VOTO_META[atual].label}</Badge>}
              {aberta && (
                <span className="gd-row" style={{ marginLeft: 'auto', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {VOTOS.map((v) => (
                    <button
                      key={v.valor}
                      type="button"
                      className="gd-btn gd-btn--text gd-btn--sm"
                      disabled={voto.isPending || atual === v.valor}
                      onClick={() =>
                        voto.mutate({ membro_email: m.email, membro_nome: m.nome, valor: v.valor })
                      }
                    >
                      {v.label}
                    </button>
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {d.resultado && (
        <p style={{ marginTop: '1rem' }}>
          <strong>Resultado:</strong> {d.resultado}
        </p>
      )}
      {aberta && podeEncerrar && (
        <div style={{ marginTop: '1rem' }}>
          <TextField label="Resultado / desfecho" value={resultado} onChange={setResultado} />
          <button
            type="button"
            className="gd-btn gd-btn--secondary gd-btn--sm"
            style={{ marginTop: '0.5rem' }}
            disabled={encerrar.isPending}
            onClick={() => encerrar.mutate(resultado.trim() || undefined)}
          >
            Encerrar e lavrar
          </button>
        </div>
      )}
    </Card>
  );
}

export function DeliberacoesPage(): ReactNode {
  const { user } = useAuth();
  const podeAbrir = hasAnyRole(user, 'coordenador_comite', 'admin');
  const { data, isLoading, isError, error } = useDeliberacoes();
  const [criando, setCriando] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Deliberações"
        description="Decisões formais do colegiado com voto nominal, quórum e resultado lavrado."
        actions={
          podeAbrir && (
            <button type="button" className="gd-btn" onClick={() => setCriando((v) => !v)}>
              {criando ? 'Fechar' : 'Nova deliberação'}
            </button>
          )
        }
      />
      {criando && podeAbrir && (
        <Card title="Nova deliberação">
          <NovaDeliberacao onDone={() => setCriando(false)} />
        </Card>
      )}

      <Card title="Deliberações">
        {isLoading && <Loading label="Carregando…" />}
        {isError && <ErrorAlert error={error} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && (
          <EmptyState>Nenhuma deliberação registrada.</EmptyState>
        )}
        {data && data.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.map((d) => (
              <li key={d.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--gd-color-border)' }}>
                <button
                  type="button"
                  className="gd-btn gd-btn--text"
                  style={{ textAlign: 'left' }}
                  onClick={() => setSel((cur) => (cur === d.id ? null : d.id))}
                >
                  <Badge tone={d.status === 'aberta' ? 'info' : 'neutral'}>{d.status}</Badge> {d.titulo}{' '}
                  <span style={{ opacity: 0.6 }}>· {d.n_votos ?? 0} voto(s)</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {sel && <Detalhe id={sel} podeEncerrar={podeAbrir} />}
    </>
  );
}
