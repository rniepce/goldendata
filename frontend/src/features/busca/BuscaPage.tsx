/*
 * Busca global (catálogo + iniciativas + golden datasets) e copiloto-chat por IA
 * sobre o acervo + base de conhecimento. A busca é instantânea; o copiloto usa a
 * IA assistiva (se configurada) e cita as fontes que utilizar.
 */

import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Badge, Card, ErrorAlert, PageHeader } from '../../components/ui';
import { Copiloto } from './Copiloto';

export function BuscaPage(): ReactNode {
  const [q, setQ] = useState('');

  const busca = useQuery({
    queryKey: ['busca', q],
    queryFn: () => api.busca(q),
    enabled: q.trim().length >= 2,
  });

  const hits = busca.data?.resultados ?? [];

  return (
    <>
      <PageHeader
        title="Busca"
        description="Encontre ferramentas, iniciativas e conjuntos de avaliação — ou converse com o copiloto."
      />

      <Card title="Buscar no acervo">
        <input
          className="gd-input"
          style={{ width: '100%', fontSize: '1rem' }}
          placeholder="Digite ao menos 2 caracteres (nome, código, unidade, responsável…)"
          aria-label="Buscar no acervo"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        {q.trim().length >= 2 && (
          <div style={{ marginTop: '1rem' }}>
            {busca.isLoading && <p>Buscando…</p>}
            {busca.isError && <ErrorAlert error={busca.error} />}
            {busca.data && hits.length === 0 && <p>Nada encontrado para “{q}”.</p>}
            {hits.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {hits.map((h) => (
                  <li
                    key={`${h.tipo}-${h.id}`}
                    style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--gd-color-border)' }}
                  >
                    <Link to={h.link} style={{ fontWeight: 600 }}>
                      {h.titulo}
                    </Link>{' '}
                    <Badge tone="neutral">{h.tipo}</Badge>
                    {h.subtitulo && (
                      <div
                        className="gd-meta__value"
                        style={{ color: 'var(--gd-color-text-muted)' }}
                      >
                        {h.subtitulo}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <div style={{ marginTop: 'var(--gd-space-4)' }}>
        <Card title="Copiloto (IA)">
          <Copiloto />
        </Card>
      </div>
    </>
  );
}
