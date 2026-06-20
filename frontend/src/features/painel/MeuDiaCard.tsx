/*
 * Meu dia / Minha semana (#75): pendências do membro logado (iniciativas
 * abertas/atrasadas + revisões a vencer), com priorização opcional por IA.
 */

import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Badge, Card, ErrorAlert, Loading, Markdown } from '../../components/ui';
import type { PlanoUrgencia } from '../../lib/types';

const TOM: Record<PlanoUrgencia, 'danger' | 'warning' | 'neutral'> = {
  atrasada: 'danger',
  prazo: 'warning',
  normal: 'neutral',
};
const ROTULO: Record<PlanoUrgencia, string> = {
  atrasada: 'Atrasada',
  prazo: 'Com prazo',
  normal: 'Em aberto',
};

export function MeuDiaCard(): ReactNode {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['planoPessoal'],
    queryFn: api.planoPessoal,
  });

  if (isLoading) {
    return (
      <Card title="Meu dia / Minha semana">
        <Loading label="Montando seu plano…" />
      </Card>
    );
  }
  if (isError) {
    return (
      <Card title="Meu dia / Minha semana">
        <ErrorAlert error={error} />
      </Card>
    );
  }
  if (!data) return null;
  if (data.itens.length === 0) {
    return (
      <Card title="Meu dia / Minha semana">
        <p style={{ margin: 0, color: 'var(--gd-color-text-muted)' }}>
          Nenhuma pendência atribuída a você no momento.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Meu dia / Minha semana">
      {data.resumo_ia && (
        <div className="gd-md--panel" style={{ marginBottom: 'var(--gd-space-3)' }}>
          <Markdown text={data.resumo_ia} />
        </div>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {data.itens.map((it, i) => (
          <li
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0',
              borderBottom: '1px solid var(--gd-color-border)',
            }}
          >
            <Badge tone={TOM[it.urgencia]}>{ROTULO[it.urgencia]}</Badge>
            <Link to={it.link} style={{ flex: 1 }}>
              {it.titulo}
            </Link>
            {it.prazo && (
              <span className="gd-mono" style={{ fontSize: '0.8rem', opacity: 0.75 }}>
                {it.prazo}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
