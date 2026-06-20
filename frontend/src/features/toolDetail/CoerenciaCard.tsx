/*
 * Coerência ficha × evidências (#59): IA aponta inconsistências entre o que a
 * ficha declara (risco, supervisão, estágio) e o que as evidências mostram
 * (KPIs, gate, inventário). Consultivo — o humano revisa e corrige a ficha.
 */

import { type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, ErrorAlert, Loading, Markdown } from '../../components/ui';

export function CoerenciaCard({ toolId }: { toolId: string }): ReactNode {
  const m = useMutation({ mutationFn: () => api.coerencia(toolId) });
  return (
    <Card
      title="Coerência (ficha × evidências)"
      actions={
        <button
          type="button"
          className="gd-btn gd-btn--secondary gd-btn--sm"
          onClick={() => m.mutate()}
          disabled={m.isPending}
        >
          {m.isPending ? 'Analisando…' : m.data ? 'Reanalisar' : 'Analisar (IA)'}
        </button>
      }
    >
      {!m.data && !m.isPending && !m.isError && (
        <p style={{ margin: 0, color: 'var(--gd-color-text-muted)' }}>
          Cruza o que a ficha declara com KPIs, gate e inventário, e aponta inconsistências.
        </p>
      )}
      {m.isPending && <Loading label="Analisando coerência…" />}
      {m.isError && <ErrorAlert error={m.error} />}
      {m.data && (
        <div className="gd-md--panel">
          <Markdown text={m.data.achados} />
        </div>
      )}
    </Card>
  );
}
