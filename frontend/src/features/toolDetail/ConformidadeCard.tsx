/*
 * Assistente de conformidade (#24): checklist determinístico CNJ 615/LGPD por
 * ferramenta (o que falta para estar conforme / passar no gate), com síntese
 * opcional por IA. O veredito é determinístico — a IA apenas verbaliza.
 */

import { type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Badge, Card, ErrorAlert, Loading, Markdown } from '../../components/ui';
import type { ConformidadeResultado, ConformidadeStatus } from '../../lib/types';

const TOM: Record<ConformidadeStatus, 'success' | 'danger' | 'neutral'> = {
  ok: 'success',
  pendente: 'danger',
  na: 'neutral',
};
const ROTULO: Record<ConformidadeStatus, string> = {
  ok: 'OK',
  pendente: 'Pendente',
  na: 'N/A',
};

export function ConformidadeCard({ toolId }: { toolId: string }): ReactNode {
  const m = useMutation({ mutationFn: () => api.conformidadeFerramenta(toolId) });
  const r: ConformidadeResultado | undefined = m.data;

  return (
    <Card title="Conformidade (CNJ 615 / LGPD)">
      {!r && !m.isPending && (
        <button
          type="button"
          className="gd-btn gd-btn--secondary gd-btn--sm"
          onClick={() => m.mutate()}
        >
          Verificar conformidade
        </button>
      )}
      {m.isPending && <Loading label="Avaliando conformidade…" />}
      {m.isError && <ErrorAlert error={m.error} />}

      {r && (
        <>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginBottom: 'var(--gd-space-3)',
            }}
          >
            <Badge tone="success">{r.ok} conformes</Badge>
            <Badge tone={r.pendentes > 0 ? 'danger' : 'neutral'}>{r.pendentes} pendentes</Badge>
            <Badge tone="neutral">{r.na} N/A</Badge>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="gd-table">
              <caption className="gd-visually-hidden">Checklist de conformidade da ferramenta</caption>
              <thead>
                <tr>
                  <th scope="col">Requisito</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Detalhe</th>
                  <th scope="col">Base</th>
                </tr>
              </thead>
              <tbody>
                {r.itens.map((it) => (
                  <tr key={it.requisito}>
                    <td>{it.requisito}</td>
                    <td>
                      <Badge tone={TOM[it.status]}>{ROTULO[it.status]}</Badge>
                    </td>
                    <td>{it.detalhe}</td>
                    <td className="gd-mono" style={{ fontSize: '0.8rem' }}>
                      {it.base}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {r.resumo_ia && (
            <div className="gd-md--panel" style={{ marginTop: 'var(--gd-space-4)' }}>
              <Markdown text={r.resumo_ia} />
              <p
                style={{
                  fontSize: 'var(--gd-font-size-xs)',
                  color: 'var(--gd-color-text-muted)',
                  marginBottom: 0,
                }}
              >
                Síntese por IA — o checklist acima é determinístico e prevalece.
              </p>
            </div>
          )}

          <button
            type="button"
            className="gd-btn gd-btn--secondary gd-btn--sm"
            onClick={() => m.mutate()}
            style={{ marginTop: 'var(--gd-space-3)' }}
          >
            Reavaliar
          </button>
        </>
      )}
    </Card>
  );
}
