/*
 * /avaliacoes — criar execução de avaliação, importar saídas (JSON) e visualizar
 * resultados por caso, métricas e relatório de regressão.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  useCreateEvalRun,
  useEvalRun,
  useSubmitEvalOutputs,
} from '../../lib/queries';
import {
  Badge,
  Card,
  ErrorAlert,
  InfoAlert,
  PageHeader,
  SuccessAlert,
  TextAreaField,
  TextField,
} from '../../components/ui';
import { parseJsonArray } from '../../lib/json';
import type {
  EvalOutputInput,
  EvalRunInput,
  EvalRunResult,
} from '../../lib/types';

export function EvaluationsPage(): ReactNode {
  const [runId, setRunId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<EvalRunResult | null>(null);

  return (
    <>
      <PageHeader
        title="Avaliações"
        description="Execute uma avaliação de uma versão da ferramenta contra um golden dataset, importe as saídas geradas e analise métricas e regressão."
      />

      <CreateRunForm onCreated={setRunId} />

      {runId && (
        <>
          <ImportOutputsForm runId={runId} onResult={setResultado} />
          {resultado && <RunMetrics resultado={resultado} />}
          <RunDetails runId={runId} />
        </>
      )}
    </>
  );
}

function CreateRunForm({ onCreated }: { onCreated: (id: string) => void }): ReactNode {
  const mutation = useCreateEvalRun();
  const [toolVersionId, setToolVersionId] = useState('');
  const [goldenDatasetId, setGoldenDatasetId] = useState('');
  const [baselineRunId, setBaselineRunId] = useState('');

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const input: EvalRunInput = {
      tool_version_id: toolVersionId.trim(),
      golden_dataset_id: goldenDatasetId.trim(),
      baseline_run_id: baselineRunId.trim() || undefined,
    };
    mutation.mutate(input, { onSuccess: (run) => onCreated(run.id) });
  }

  return (
    <Card title="Nova execução de avaliação">
      <form onSubmit={handleSubmit} noValidate>
        {mutation.isError && <ErrorAlert error={mutation.error} />}
        {mutation.isSuccess && <SuccessAlert>Execução criada. Importe as saídas abaixo.</SuccessAlert>}
        <div className="gd-form-grid">
          <TextField
            label="ID da versão da ferramenta"
            required
            value={toolVersionId}
            onChange={setToolVersionId}
          />
          <TextField
            label="ID do golden dataset"
            required
            value={goldenDatasetId}
            onChange={setGoldenDatasetId}
          />
          <TextField
            label="ID da execução baseline"
            value={baselineRunId}
            onChange={setBaselineRunId}
            hint="Opcional — para comparação de regressão."
          />
        </div>
        <button type="submit" className="gd-btn" disabled={mutation.isPending}>
          {mutation.isPending ? 'Criando…' : 'Criar execução'}
        </button>
      </form>
    </Card>
  );
}

function ImportOutputsForm({
  runId,
  onResult,
}: {
  runId: string;
  onResult: (r: EvalRunResult) => void;
}): ReactNode {
  const mutation = useSubmitEvalOutputs(runId);
  const [json, setJson] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setParseError(null);
    const parsed = parseJsonArray<EvalOutputInput>(json);
    if (!parsed.ok) {
      setParseError(parsed.error);
      return;
    }
    const invalido = parsed.value.find(
      (item) => !item.golden_case_id || typeof item.texto_gerado !== 'string',
    );
    if (invalido) {
      setParseError('Cada item deve conter "golden_case_id" e "texto_gerado".');
      return;
    }
    mutation.mutate(parsed.value, { onSuccess: onResult });
  }

  return (
    <Card title="Importar saídas geradas">
      <InfoAlert>
        Cole um array JSON de saídas. Formato:{' '}
        <span className="gd-mono">
          {'[{ "golden_case_id": "...", "texto_gerado": "...", "fonte_geracao": "..." }]'}
        </span>
      </InfoAlert>
      <form onSubmit={handleSubmit} noValidate>
        {mutation.isError && <ErrorAlert error={mutation.error} />}
        {parseError && <ErrorAlert error={new Error(parseError)} />}
        {mutation.isSuccess && <SuccessAlert>Saídas processadas e métricas calculadas.</SuccessAlert>}
        <TextAreaField
          label="Saídas (JSON)"
          required
          value={json}
          onChange={setJson}
          rows={10}
        />
        <button type="submit" className="gd-btn" disabled={mutation.isPending}>
          {mutation.isPending ? 'Processando…' : 'Enviar saídas'}
        </button>
      </form>
    </Card>
  );
}

function RunMetrics({ resultado }: { resultado: EvalRunResult }): ReactNode {
  return (
    <Card title="Métricas da execução">
      <p>
        Casos avaliados: <strong>{resultado.n_casos}</strong>
      </p>
      <div className="gd-kpi-grid">
        {Object.entries(resultado.metricas).map(([nome, valor]) => (
          <div className="gd-kpi" key={nome}>
            <div className="gd-kpi__value">{formatMetric(valor)}</div>
            <div className="gd-kpi__label">{nome.replace(/_/g, ' ')}</div>
          </div>
        ))}
      </div>

      {resultado.regression && (
        <div
          className={`gd-alert ${resultado.regression.regrediu ? 'gd-alert--error' : 'gd-alert--success'}`}
          role="status"
          aria-live="polite"
        >
          <strong>Relatório de regressão:</strong>{' '}
          {resultado.regression.regrediu
            ? 'Houve regressão em relação ao baseline.'
            : 'Sem regressão em relação ao baseline.'}
          {resultado.regression.deltas && (
            <ul style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              {Object.entries(resultado.regression.deltas).map(([metrica, delta]) => (
                <li key={metrica}>
                  {metrica.replace(/_/g, ' ')}:{' '}
                  <Badge tone={delta < 0 ? 'danger' : 'success'}>
                    {delta >= 0 ? '+' : ''}
                    {formatMetric(delta)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function RunDetails({ runId }: { runId: string }): ReactNode {
  const { data, isLoading, isError, error } = useEvalRun(runId);

  if (isLoading) return <Card title="Resultados por caso">Carregando…</Card>;
  if (isError) return <Card title="Resultados por caso"><ErrorAlert error={error} /></Card>;
  if (!data) return null;

  return (
    <Card title="Resultados por caso">
      {data.outputs.length === 0 ? (
        <p>Ainda não há saídas registradas para esta execução.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="gd-table">
            <thead>
              <tr>
                <th scope="col">Caso</th>
                <th scope="col">Texto gerado</th>
                <th scope="col">Fonte</th>
              </tr>
            </thead>
            <tbody>
              {data.outputs.map((output) => (
                <tr key={output.id}>
                  <td className="gd-mono">{output.golden_case_id}</td>
                  <td style={{ maxWidth: 520, whiteSpace: 'pre-wrap' }}>{output.texto_gerado}</td>
                  <td>{output.fonte_geracao ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function formatMetric(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3);
}
