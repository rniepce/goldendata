/*
 * /gate — configuração de thresholds, decisão automática (checks objetivos) e
 * aprovação/reprovação manual. Quando os checks reprovam objetivamente, a
 * aprovação manual é bloqueada (o back-end pode retornar 409).
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth, hasAnyRole } from '../../lib/auth-oidc';
import { useCreateGate, useDecideGate } from '../../lib/queries';
import { ApiError } from '../../lib/api';
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
import { parseJsonObject } from '../../lib/json';
import type { Gate, GateInput } from '../../lib/types';

export function GatePage(): ReactNode {
  const { user } = useAuth();
  const [versionId, setVersionId] = useState('');
  const [gate, setGate] = useState<Gate | null>(null);

  const podeDecidir = hasAnyRole(user, 'coordenador_comite', 'admin');

  return (
    <>
      <PageHeader
        title="Gate de promoção"
        description="Defina os thresholds objetivos para promover uma versão. A decisão automática avalia cada métrica; a homologação manual fica bloqueada quando os checks reprovam."
      />

      <ConfigGateForm versionId={versionId} onVersionIdChange={setVersionId} onCreated={setGate} />

      {gate && (
        <>
          <GateChecks gate={gate} />
          {podeDecidir ? (
            <DecideGateForm gate={gate} onDecided={setGate} />
          ) : (
            <InfoAlert>
              Apenas o coordenador do comitê ou administrador pode homologar a decisão do gate.
            </InfoAlert>
          )}
        </>
      )}
    </>
  );
}

function ConfigGateForm({
  versionId,
  onVersionIdChange,
  onCreated,
}: {
  versionId: string;
  onVersionIdChange: (v: string) => void;
  onCreated: (g: Gate) => void;
}): ReactNode {
  const mutation = useCreateGate(versionId);
  const [evalRunId, setEvalRunId] = useState('');
  const [thresholdsText, setThresholdsText] = useState(
    '{\n  "taxa_aceitacao": 0.85,\n  "taxa_alucinacao": 0.05\n}',
  );
  const [parseError, setParseError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setParseError(null);
    const parsed = parseJsonObject(thresholdsText);
    if (!parsed.ok) {
      setParseError(parsed.error);
      return;
    }
    const metricas: Record<string, number> = {};
    for (const [chave, valor] of Object.entries(parsed.value)) {
      if (typeof valor !== 'number') {
        setParseError(`O threshold "${chave}" deve ser numérico.`);
        return;
      }
      metricas[chave] = valor;
    }
    const input: GateInput = { eval_run_id: evalRunId.trim(), metricas_exigidas: metricas };
    mutation.mutate(input, { onSuccess: onCreated });
  }

  return (
    <Card title="Configurar gate">
      <form onSubmit={handleSubmit} noValidate>
        {mutation.isError && <ErrorAlert error={mutation.error} />}
        {parseError && <ErrorAlert error={new Error(parseError)} />}
        {mutation.isSuccess && <SuccessAlert>Gate avaliado. Veja os checks abaixo.</SuccessAlert>}
        <div className="gd-form-grid">
          <TextField
            label="ID da versão da ferramenta"
            required
            value={versionId}
            onChange={onVersionIdChange}
          />
          <TextField label="ID da execução de avaliação" required value={evalRunId} onChange={setEvalRunId} />
        </div>
        <TextAreaField
          label="Thresholds exigidos (JSON)"
          required
          value={thresholdsText}
          onChange={setThresholdsText}
          hint="Mapa métrica → valor exigido."
          rows={6}
        />
        <button type="submit" className="gd-btn" disabled={mutation.isPending || !versionId}>
          {mutation.isPending ? 'Avaliando…' : 'Avaliar gate'}
        </button>
      </form>
    </Card>
  );
}

function GateChecks({ gate }: { gate: Gate }): ReactNode {
  return (
    <Card title="Decisão automática (checks objetivos)">
      <div className="gd-row" style={{ marginBottom: '1rem' }}>
        <span>Resultado automático:</span>
        <Badge tone={gate.aprovado_automatico ? 'success' : 'danger'}>
          {gate.aprovado_automatico ? 'Aprovado automaticamente' : 'Reprovado objetivamente'}
        </Badge>
        {gate.decisao && (
          <Badge tone={gate.decisao === 'aprovado' ? 'success' : 'danger'}>
            Decisão final: {gate.decisao}
          </Badge>
        )}
      </div>
      <table className="gd-table">
        <thead>
          <tr>
            <th scope="col">Métrica</th>
            <th scope="col">Exigido</th>
            <th scope="col">Obtido</th>
            <th scope="col">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {gate.checks.map((check) => (
            <tr key={check.metrica}>
              <td>{check.metrica.replace(/_/g, ' ')}</td>
              <td className="gd-mono">{check.exigido}</td>
              <td className="gd-mono">{check.obtido}</td>
              <td>
                <Badge tone={check.passou ? 'success' : 'danger'}>
                  {check.passou ? 'passou' : 'reprovou'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function DecideGateForm({
  gate,
  onDecided,
}: {
  gate: Gate;
  onDecided: (g: Gate) => void;
}): ReactNode {
  const mutation = useDecideGate(gate.id);
  const [justificativa, setJustificativa] = useState('');
  const [bloqueio, setBloqueio] = useState<string | null>(null);

  // Bloqueia aprovação quando o gate reprovou objetivamente.
  const aprovacaoBloqueada = !gate.aprovado_automatico;

  function decidir(aprovar: boolean): void {
    setBloqueio(null);
    if (aprovar && aprovacaoBloqueada) {
      setBloqueio('Aprovação bloqueada: o gate reprovou objetivamente nos checks. Não é possível promover.');
      return;
    }
    if (!justificativa.trim()) {
      setBloqueio('Informe a justificativa para registrar a decisão.');
      return;
    }
    mutation.mutate(
      { aprovar, justificativa: justificativa.trim() },
      {
        onSuccess: onDecided,
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            setBloqueio(
              'O servidor bloqueou a aprovação (HTTP 409): o gate reprovou objetivamente.',
            );
          }
        },
      },
    );
  }

  return (
    <Card title="Homologar decisão">
      {aprovacaoBloqueada && (
        <div className="gd-alert gd-alert--warning" role="alert">
          Esta versão reprovou nos checks objetivos. A aprovação está bloqueada; somente a
          reprovação pode ser registrada.
        </div>
      )}
      {mutation.isError && <ErrorAlert error={mutation.error} />}
      {bloqueio && <ErrorAlert error={new Error(bloqueio)} />}
      {mutation.isSuccess && <SuccessAlert>Decisão registrada.</SuccessAlert>}

      <TextAreaField
        label="Justificativa da decisão"
        required
        value={justificativa}
        onChange={setJustificativa}
        rows={4}
      />
      <div className="gd-row">
        <button
          type="button"
          className="gd-btn"
          disabled={mutation.isPending || aprovacaoBloqueada}
          onClick={() => decidir(true)}
        >
          Aprovar e promover
        </button>
        <button
          type="button"
          className="gd-btn gd-btn--danger"
          disabled={mutation.isPending}
          onClick={() => decidir(false)}
        >
          Reprovar
        </button>
      </div>
    </Card>
  );
}
