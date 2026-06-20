/*
 * Vigília de hoje (#56): a sentinela do GEX-IA — boletim por IA do que exige
 * ação humana HOJE, a partir do estado agregado (cockpit). Sob demanda (botão).
 */

import { type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, ErrorAlert, Loading, Markdown } from '../../components/ui';

export function VigiliaCard(): ReactNode {
  const v = useMutation({ mutationFn: () => api.vigilia() });
  return (
    <Card
      title="Vigília de hoje (IA)"
      actions={
        <button
          type="button"
          className="gd-btn gd-btn--secondary gd-btn--sm"
          onClick={() => v.mutate()}
          disabled={v.isPending}
        >
          {v.isPending ? 'Gerando…' : v.data ? 'Atualizar' : 'Gerar'}
        </button>
      }
    >
      {!v.data && !v.isPending && !v.isError && (
        <p style={{ margin: 0, color: 'var(--gd-color-text-muted)' }}>
          Gere o boletim do que exige ação do comitê hoje, em ordem de urgência.
        </p>
      )}
      {v.isPending && <Loading label="Consultando a sentinela…" />}
      {v.isError && <ErrorAlert error={v.error} />}
      {v.data && (
        <div className="gd-md--panel">
          <Markdown text={v.data.boletim} />
        </div>
      )}
    </Card>
  );
}
