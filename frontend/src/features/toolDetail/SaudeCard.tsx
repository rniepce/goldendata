/*
 * Saúde da ferramenta (#11): semáforo consolidando conformidade, KPIs e gate.
 */

import { type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Badge, Card, ErrorAlert, Loading } from '../../components/ui';
import type { ToolSaude } from '../../lib/types';

const NIVEL: Record<ToolSaude['nivel'], { tone: 'success' | 'warning' | 'danger'; label: string }> = {
  verde: { tone: 'success', label: 'Saudável' },
  ambar: { tone: 'warning', label: 'Atenção' },
  vermelho: { tone: 'danger', label: 'Crítico' },
};

export function SaudeCard({ toolId }: { toolId: string }): ReactNode {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['toolSaude', toolId],
    queryFn: () => api.toolSaude(toolId),
  });

  return (
    <Card title="Saúde da ferramenta">
      {isLoading && <Loading label="Avaliando saúde…" />}
      {isError && <ErrorAlert error={error} />}
      {data && (
        <>
          <div
            className="gd-row"
            style={{ marginBottom: '0.75rem', alignItems: 'center', gap: '0.5rem' }}
          >
            <Badge tone={NIVEL[data.nivel].tone}>{NIVEL[data.nivel].label}</Badge>
            {data.em_producao && <Badge tone="info">em produção</Badge>}
            {data.taxa_aceitacao != null && (
              <span className="gd-mono" style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                aceitação {Math.round(data.taxa_aceitacao * 100)}%
              </span>
            )}
            {data.taxa_alucinacao != null && (
              <span className="gd-mono" style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                alucinação {Math.round(data.taxa_alucinacao * 100)}%
              </span>
            )}
          </div>
          {data.sinais.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {data.sinais.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: 'var(--gd-color-text-muted)' }}>
              Sem sinais de atenção no momento.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
