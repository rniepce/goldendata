/*
 * Painel inicial do GEX-IA — portfólio de iniciativas.
 * Duas visões alternáveis (por categoria / kanban por status), barra de
 * responsáveis (clique para filtrar), cards com resumo no hover e drawer de
 * detalhes. Criação de iniciativa para papéis de edição.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { useAuth, hasAnyRole } from '../../lib/auth-oidc';
import { useIniciativas } from '../../lib/queries';
import { ErrorAlert, Loading, PageHeader } from '../../components/ui';
import {
  CATEGORIA_META,
  CATEGORIA_ORDEM,
  STATUS_META,
  STATUS_ORDEM,
  corMembro,
} from '../../lib/options';
import type { Iniciativa } from '../../lib/types';
import { IniciativaCard, iniciais } from './IniciativaCard';
import { IniciativaDrawer } from './IniciativaDrawer';
import { IniciativaForm } from './IniciativaForm';
import { KpiBar } from './KpiBar';
import { MeuDiaCard } from './MeuDiaCard';
import { VigiliaCard } from './VigiliaCard';
import { CalendarView } from './CalendarView';
import './painel.css';

type Visao = 'categoria' | 'status' | 'calendario';

export function PainelPage(): ReactNode {
  const { user } = useAuth();
  const podeEditar = hasAnyRole(user, 'owner_ferramenta', 'coordenador_comite', 'admin');
  const { data, isLoading, isError, error } = useIniciativas();

  const [visao, setVisao] = useState<Visao>('categoria');
  const [filtroResp, setFiltroResp] = useState<string | null>(null);
  const [aberta, setAberta] = useState<Iniciativa | null>(null);
  const [novaAberta, setNovaAberta] = useState(false);

  const todas = data ?? [];

  // Responsáveis distintos (com contagem) para a barra de filtro.
  const responsaveis = useMemo(() => {
    const m = new Map<string, { nome: string; count: number }>();
    for (const i of todas) {
      const key = i.responsavel_email ?? '—';
      const nome = i.responsavel_nome ?? 'Sem responsável';
      const cur = m.get(key) ?? { nome, count: 0 };
      cur.count += 1;
      m.set(key, cur);
    }
    return [...m.entries()].map(([email, v]) => ({ email, ...v })).sort((a, b) => b.count - a.count);
  }, [todas]);

  const visiveis = filtroResp
    ? todas.filter((i) => (i.responsavel_email ?? '—') === filtroResp)
    : todas;

  if (isLoading) return <Loading label="Carregando o painel…" />;
  if (isError) return <ErrorAlert error={error} />;

  return (
    <>
      <PageHeader
        title="Painel do GEX-IA"
        description="Portfólio de iniciativas em andamento — passe o mouse nos cards para o resumo, clique para detalhes."
        actions={
          podeEditar ? (
            <button type="button" className="gd-btn" onClick={() => setNovaAberta((v) => !v)}>
              {novaAberta ? 'Fechar' : 'Nova iniciativa'}
            </button>
          ) : undefined
        }
      />

      {novaAberta && podeEditar && (
        <div style={{ marginBottom: 'var(--gd-space-5)' }}>
          <IniciativaForm onCreated={() => setNovaAberta(false)} />
        </div>
      )}

      {/* KPIs (refletem o filtro de responsável quando ativo) */}
      <KpiBar itens={visiveis} />

      {/* Plano pessoal do membro logado (#75) + vigília do comitê (#56) */}
      <div style={{ marginTop: 'var(--gd-space-4)' }}>
        <MeuDiaCard />
      </div>
      <div style={{ marginTop: 'var(--gd-space-4)' }}>
        <VigiliaCard />
      </div>

      {/* Barra de responsáveis (filtro) */}
      <div className="painel-responsaveis" role="group" aria-label="Filtrar por responsável">
        <button
          type="button"
          className="painel-chip"
          aria-pressed={filtroResp === null}
          onClick={() => setFiltroResp(null)}
        >
          Todos <span className="painel-chip__count">({todas.length})</span>
        </button>
        {responsaveis.map((r) => (
          <button
            key={r.email}
            type="button"
            className="painel-chip"
            aria-pressed={filtroResp === r.email}
            onClick={() => setFiltroResp((cur) => (cur === r.email ? null : r.email))}
            title={`Ver iniciativas de ${r.nome}`}
          >
            <span className="painel-avatar" style={{ background: corMembro(r.email) }}>
              {iniciais(r.nome)}
            </span>
            {r.nome.split(' ')[0]} <span className="painel-chip__count">({r.count})</span>
          </button>
        ))}
      </div>

      {/* Toolbar: alternar visão */}
      <div className="painel-toolbar">
        <div className="painel-toggle" role="group" aria-label="Visão do painel">
          <button type="button" aria-pressed={visao === 'categoria'} onClick={() => setVisao('categoria')}>
            Por categoria
          </button>
          <button type="button" aria-pressed={visao === 'status'} onClick={() => setVisao('status')}>
            Kanban por status
          </button>
          <button type="button" aria-pressed={visao === 'calendario'} onClick={() => setVisao('calendario')}>
            Calendário
          </button>
        </div>
        {filtroResp && (
          <span style={{ color: 'var(--gd-color-text-muted)', fontSize: 'var(--gd-font-size-sm)' }}>
            Filtrando por responsável · {visiveis.length} iniciativa(s)
          </span>
        )}
      </div>

      {visiveis.length === 0 ? (
        <p>Nenhuma iniciativa para este filtro.</p>
      ) : visao === 'categoria' ? (
        <ViewCategoria itens={visiveis} onOpen={setAberta} />
      ) : visao === 'status' ? (
        <ViewStatus itens={visiveis} onOpen={setAberta} />
      ) : (
        <CalendarView itens={visiveis} onOpen={setAberta} />
      )}

      {aberta && <IniciativaDrawer item={aberta} onClose={() => setAberta(null)} />}
    </>
  );
}

function ViewCategoria({
  itens,
  onOpen,
}: {
  itens: Iniciativa[];
  onOpen: (i: Iniciativa) => void;
}): ReactNode {
  return (
    <>
      {CATEGORIA_ORDEM.map((cat) => {
        const grupo = itens.filter((i) => i.categoria === cat);
        if (grupo.length === 0) return null;
        const meta = CATEGORIA_META[cat];
        return (
          <section key={cat} className="painel-secao">
            <h2 className="painel-secao__titulo">
              <span className="painel-secao__bullet" style={{ background: meta.cor }} />
              {meta.label} <span className="painel-secao__count">· {grupo.length}</span>
            </h2>
            <div className="painel-grid">
              {grupo.map((i) => (
                <IniciativaCard key={i.id} item={i} onOpen={onOpen} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

function ViewStatus({
  itens,
  onOpen,
}: {
  itens: Iniciativa[];
  onOpen: (i: Iniciativa) => void;
}): ReactNode {
  return (
    <div className="painel-kanban">
      {STATUS_ORDEM.map((st) => {
        const grupo = itens.filter((i) => i.status === st);
        const meta = STATUS_META[st];
        return (
          <div key={st} className="painel-coluna">
            <div className="painel-coluna__titulo">
              <span>{meta.label}</span>
              <span className="painel-chip__count">{grupo.length}</span>
            </div>
            {grupo.map((i) => (
              <IniciativaCard key={i.id} item={i} onOpen={onOpen} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
