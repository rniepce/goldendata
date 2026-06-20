/*
 * /carga — Mapa de carga dos membros do GEX-IA (#39).
 * Iniciativas abertas por responsável (total, atrasadas, alta prioridade) para
 * enxergar o balanceamento de trabalho entre os 6.
 */

import { useMemo, type ReactNode } from 'react';
import { useIniciativas } from '../../lib/queries';
import { Badge, Card, ErrorAlert, Loading, PageHeader } from '../../components/ui';
import { MEMBROS_GEXIA, corMembro } from '../../lib/options';
import { iniciais } from '../painel/avatar';

const ABERTAS = new Set(['a_fazer', 'em_andamento', 'em_pausa']);

interface Carga {
  total: number;
  atrasadas: number;
  alta: number;
}

function CartaoMembro({ nome, email, cor, carga }: { nome: string; email: string; cor: string; carga: Carga }): ReactNode {
  return (
    <Card>
      <div className="gd-row" style={{ alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span className="painel-avatar" style={{ background: cor }} title={email}>
          {iniciais(nome)}
        </span>
        <strong>{nome.split(' ').slice(0, 2).join(' ')}</strong>
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 600 }}>{carga.total}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--gd-color-text-muted)', marginBottom: '0.5rem' }}>
        iniciativas abertas
      </div>
      <div className="gd-row" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
        {carga.atrasadas > 0 && <Badge tone="danger">{carga.atrasadas} atrasada(s)</Badge>}
        {carga.alta > 0 && <Badge tone="warning">{carga.alta} alta</Badge>}
        {carga.total === 0 && <Badge tone="neutral">sem pendências</Badge>}
      </div>
    </Card>
  );
}

export function CargaPage(): ReactNode {
  const { data, isLoading, isError, error } = useIniciativas();

  const porMembro = useMemo(() => {
    const map = new Map<string, Carga>();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    for (const i of data ?? []) {
      if (!ABERTAS.has(i.status)) continue;
      const key = i.responsavel_email ?? '—';
      const c = map.get(key) ?? { total: 0, atrasadas: 0, alta: 0 };
      c.total += 1;
      if (i.prioridade === 'alta') c.alta += 1;
      if (i.prazo && new Date(i.prazo + 'T00:00:00') < hoje) c.atrasadas += 1;
      map.set(key, c);
    }
    return map;
  }, [data]);

  if (isLoading) return <Loading label="Carregando carga…" />;
  if (isError) return <ErrorAlert error={error} />;

  const semDono = porMembro.get('—');
  const vazio: Carga = { total: 0, atrasadas: 0, alta: 0 };

  return (
    <>
      <PageHeader
        title="Carga da equipe"
        description="Iniciativas abertas por responsável — para enxergar o balanceamento entre os membros do GEX-IA."
      />
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}
      >
        {MEMBROS_GEXIA.map((m) => (
          <CartaoMembro
            key={m.email}
            nome={m.nome}
            email={m.email}
            cor={corMembro(m.email)}
            carga={porMembro.get(m.email) ?? vazio}
          />
        ))}
        {semDono && semDono.total > 0 && (
          <CartaoMembro nome="Sem responsável" email="—" cor="#5f5749" carga={semDono} />
        )}
      </div>
    </>
  );
}
