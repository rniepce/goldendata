/*
 * /indicadores — dashboards de qualidade por ferramenta/versão:
 * taxa de aceitação, correção, alucinação e edit-distance.
 */

import { useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth, hasAnyRole } from '../../lib/auth-oidc';
import { useTools, useToolKpi, useRollupKpi } from '../../lib/queries';
import {
  Card,
  EmptyState,
  ErrorAlert,
  InfoAlert,
  Loading,
  PageHeader,
  SelectField,
  SuccessAlert,
  TextField,
} from '../../components/ui';
import type { KpiQuality } from '../../lib/types';

export function IndicatorsPage(): ReactNode {
  const { user } = useAuth();
  const { data: tools } = useTools();
  const [toolId, setToolId] = useState('');
  const { data: kpis, isLoading, isError, error } = useToolKpi(toolId || undefined);

  const podeRollup = hasAnyRole(user, 'avaliador', 'coordenador_comite', 'owner_ferramenta', 'admin');

  const chartData = useMemo(() => {
    if (!kpis) return [];
    return kpis.map((kpi: KpiQuality, index) => ({
      versao: kpi.version_id?.slice(0, 8) ?? `v${index + 1}`,
      aceitacao: pct(kpi.taxa_aceitacao),
      correcao: pct(kpi.taxa_correcao),
      alucinacao: pct(kpi.taxa_alucinacao),
      editDistance: kpi.edit_distance_medio ?? 0,
    }));
  }, [kpis]);

  return (
    <>
      <PageHeader
        title="Indicadores de qualidade"
        description="Acompanhe a evolução de aceitação, correção, alucinação e edit-distance por versão da ferramenta."
      />

      <Card title="Seleção de ferramenta">
        <SelectField
          label="Ferramenta"
          value={toolId}
          onChange={setToolId}
          placeholder="Selecione a ferramenta"
          options={(tools ?? []).map((t) => ({ value: t.id, label: t.nome }))}
        />
        {podeRollup && toolId && <RollupKpiForm toolId={toolId} />}
      </Card>

      {!toolId && <InfoAlert>Selecione uma ferramenta para visualizar os indicadores.</InfoAlert>}
      {toolId && isLoading && <Loading label="Carregando indicadores…" />}
      {toolId && isError && <ErrorAlert error={error} />}

      {toolId && kpis && kpis.length === 0 && (
        <EmptyState>Nenhum rollup de KPI disponível para esta ferramenta.</EmptyState>
      )}

      {chartData.length > 0 && (
        <>
          <Card title="Taxas por versão (%)">
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="versao" />
                  <YAxis unit="%" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="aceitacao" name="Aceitação" fill="#1d6b3b" />
                  <Bar dataKey="correcao" name="Correção" fill="#8a5a00" />
                  <Bar dataKey="alucinacao" name="Alucinação" fill="#a31621" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Edit-distance médio por versão">
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="versao" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="editDistance"
                    name="Edit-distance"
                    stroke="#14387f"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <KpiTable kpis={kpis ?? []} />
        </>
      )}
    </>
  );
}

function RollupKpiForm({ toolId }: { toolId: string }): ReactNode {
  const mutation = useRollupKpi(toolId);
  const [versionId, setVersionId] = useState('');

  return (
    <div style={{ marginTop: '1rem' }} className="gd-row">
      <div style={{ flex: 1, minWidth: 260 }}>
        <TextField
          label="ID da versão para gerar rollup de KPI"
          value={versionId}
          onChange={setVersionId}
        />
      </div>
      <button
        type="button"
        className="gd-btn gd-btn--secondary"
        style={{ alignSelf: 'flex-end' }}
        disabled={mutation.isPending || !versionId.trim()}
        onClick={() => mutation.mutate(versionId.trim())}
      >
        {mutation.isPending ? 'Gerando…' : 'Gerar rollup'}
      </button>
      {mutation.isError && (
        <div style={{ flexBasis: '100%' }}>
          <ErrorAlert error={mutation.error} />
        </div>
      )}
      {mutation.isSuccess && (
        <div style={{ flexBasis: '100%' }}>
          <SuccessAlert>Rollup de KPI gerado.</SuccessAlert>
        </div>
      )}
    </div>
  );
}

function KpiTable({ kpis }: { kpis: KpiQuality[] }): ReactNode {
  return (
    <Card title="Detalhamento dos KPIs">
      <div style={{ overflowX: 'auto' }}>
        <table className="gd-table">
          <thead>
            <tr>
              <th scope="col">Versão</th>
              <th scope="col">Aceitação</th>
              <th scope="col">Correção</th>
              <th scope="col">Alucinação</th>
              <th scope="col">Edit-distance</th>
              <th scope="col">Amostras</th>
            </tr>
          </thead>
          <tbody>
            {kpis.map((kpi) => (
              <tr key={kpi.id}>
                <td className="gd-mono">{kpi.version_id}</td>
                <td>{fmtPct(kpi.taxa_aceitacao)}</td>
                <td>{fmtPct(kpi.taxa_correcao)}</td>
                <td>{fmtPct(kpi.taxa_alucinacao)}</td>
                <td>{kpi.edit_distance_medio?.toFixed(2) ?? '—'}</td>
                <td>{kpi.n_amostras ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function pct(value?: number): number {
  return value === undefined ? 0 : Math.round(value * 1000) / 10;
}
function fmtPct(value?: number): string {
  return value === undefined ? '—' : `${pct(value)}%`;
}
