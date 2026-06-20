/*
 * /governanca — Kanban de governança por estágio do dossiê GEX-IA (#14).
 * Colunas dinâmicas pelos valores de estagio_gexia; cada card linka à ficha e
 * permite mover a solução para outro estágio existente (PATCH). Novos estágios
 * são criados editando o dossiê na própria ficha.
 */

import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTools, useUpdateToolStage } from '../../lib/queries';
import { ErrorAlert, Loading, PageHeader, RiskBadge } from '../../components/ui';
import type { Tool } from '../../lib/types';

const SEM = 'Sem estágio';

export function GovernancaKanbanPage(): ReactNode {
  const { data: tools, isLoading, isError, error } = useTools();
  const mover = useUpdateToolStage();

  const { colunas, estagios } = useMemo(() => {
    const map = new Map<string, Tool[]>();
    for (const t of tools ?? []) {
      const key = (t.estagio_gexia && t.estagio_gexia.trim()) || SEM;
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    const nomes = [...map.keys()].filter((k) => k !== SEM).sort((a, b) => a.localeCompare(b));
    const ordem = [...nomes, ...(map.has(SEM) ? [SEM] : [])];
    return {
      colunas: ordem.map((k) => ({ estagio: k, itens: map.get(k) ?? [] })),
      estagios: nomes,
    };
  }, [tools]);

  if (isLoading) return <Loading label="Carregando governança…" />;
  if (isError) return <ErrorAlert error={error} />;

  return (
    <>
      <PageHeader
        title="Governança por estágio"
        description="Portfólio de soluções pelo estágio do dossiê GEX-IA. Mova um item para outro estágio existente; novos estágios são definidos na ficha."
      />
      {mover.isError && <ErrorAlert error={mover.error} />}
      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        {colunas.map((col) => (
          <div
            key={col.estagio}
            style={{
              minWidth: 260,
              flex: '0 0 260px',
              background: 'var(--gd-color-bg-subtle, #efe9dc)',
              borderRadius: 8,
              padding: '0.75rem',
            }}
          >
            <h2 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem' }}>
              {col.estagio} <span style={{ opacity: 0.6 }}>({col.itens.length})</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {col.itens.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: 'var(--gd-color-surface, #fff)',
                    border: '1px solid var(--gd-color-border)',
                    borderRadius: 6,
                    padding: '0.5rem',
                  }}
                >
                  <Link to={`/ferramentas/${t.id}`} style={{ fontWeight: 600, display: 'block' }}>
                    {t.nome}
                  </Link>
                  <div className="gd-mono" style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                    {t.codigo_institucional}
                  </div>
                  <div style={{ marginTop: '0.35rem' }}>
                    <RiskBadge risco={t.categoria_risco} />
                  </div>
                  {estagios.length > 1 && (
                    <select
                      className="gd-select"
                      style={{ marginTop: '0.35rem', fontSize: '0.8rem' }}
                      value=""
                      onChange={(e) =>
                        e.target.value && mover.mutate({ id: t.id, estagio: e.target.value })
                      }
                      aria-label={`Mover ${t.nome} para outro estágio`}
                    >
                      <option value="">Mover para…</option>
                      {estagios
                        .filter((s) => s !== col.estagio)
                        .map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
