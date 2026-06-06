/*
 * /anotacao — fila human-in-the-loop. Para cada saída de uma execução, o avaliador
 * marca aceite/correção/rejeição, informa texto corrigido e marca alucinação.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useEvalRun, useCreateAnnotation } from '../../lib/queries';
import {
  Badge,
  Card,
  CheckboxField,
  ErrorAlert,
  InfoAlert,
  PageHeader,
  SelectField,
  SuccessAlert,
  TextAreaField,
  TextField,
} from '../../components/ui';
import { ANNOTATION_LABEL_OPTIONS } from '../../lib/options';
import type { AnnotationInput, AnnotationLabel, EvalOutput } from '../../lib/types';

export function AnnotationPage(): ReactNode {
  const [runIdInput, setRunIdInput] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const { data, isLoading, isError, error } = useEvalRun(runId ?? undefined);
  const [anotados, setAnotados] = useState<Set<string>>(new Set());

  return (
    <>
      <PageHeader
        title="Anotação — revisão humana (HITL)"
        description="Avalie cada saída gerada: aceite, correção ou rejeição, com indicação de alucinação. As anotações alimentam os indicadores de qualidade."
      />

      <Card title="Selecionar execução de avaliação">
        <form
          className="gd-row"
          onSubmit={(event) => {
            event.preventDefault();
            setAnotados(new Set());
            setRunId(runIdInput.trim() || null);
          }}
        >
          <div style={{ flex: 1, minWidth: 260 }}>
            <TextField label="ID da execução (eval run)" value={runIdInput} onChange={setRunIdInput} />
          </div>
          <button type="submit" className="gd-btn" style={{ alignSelf: 'flex-end' }}>
            Carregar fila
          </button>
        </form>
      </Card>

      {!runId && <InfoAlert>Informe o ID de uma execução para carregar a fila de anotação.</InfoAlert>}
      {isLoading && <Card title="Fila">Carregando saídas…</Card>}
      {isError && <ErrorAlert error={error} />}

      {data && data.outputs.length === 0 && (
        <InfoAlert>Esta execução ainda não possui saídas para anotar.</InfoAlert>
      )}

      {data &&
        data.outputs.map((output, index) => (
          <AnnotationCard
            key={output.id}
            output={output}
            indice={index + 1}
            total={data.outputs.length}
            jaAnotado={anotados.has(output.id)}
            onAnotado={() => setAnotados((prev) => new Set(prev).add(output.id))}
          />
        ))}
    </>
  );
}

function AnnotationCard({
  output,
  indice,
  total,
  jaAnotado,
  onAnotado,
}: {
  output: EvalOutput;
  indice: number;
  total: number;
  jaAnotado: boolean;
  onAnotado: () => void;
}): ReactNode {
  const mutation = useCreateAnnotation();
  const [label, setLabel] = useState<AnnotationLabel>('aceite');
  const [textoCorrigido, setTextoCorrigido] = useState('');
  const [marcouAlucinacao, setMarcouAlucinacao] = useState(false);
  const [justificativa, setJustificativa] = useState('');

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const input: AnnotationInput = {
      eval_output_id: output.id,
      label,
      texto_corrigido: label === 'correcao' ? textoCorrigido : undefined,
      marcou_alucinacao: marcouAlucinacao,
      justificativa: justificativa.trim() || undefined,
    };
    mutation.mutate(input, { onSuccess: onAnotado });
  }

  return (
    <Card
      title={`Saída ${indice} de ${total}`}
      actions={jaAnotado ? <Badge tone="success">anotada</Badge> : undefined}
    >
      <div className="gd-stack">
        <div>
          <div className="gd-meta__label">Caso</div>
          <div className="gd-mono">{output.golden_case_id}</div>
        </div>
        <div>
          <div className="gd-meta__label">Texto gerado</div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              background: 'var(--gd-color-surface-alt)',
              padding: 'var(--gd-space-3)',
              borderRadius: 'var(--gd-radius)',
              margin: 0,
            }}
          >
            {output.texto_gerado}
          </pre>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {mutation.isError && <ErrorAlert error={mutation.error} />}
          {mutation.isSuccess && <SuccessAlert>Anotação registrada.</SuccessAlert>}

          <SelectField
            label="Decisão"
            required
            value={label}
            onChange={(v) => setLabel(v as AnnotationLabel)}
            options={ANNOTATION_LABEL_OPTIONS}
          />

          {label === 'correcao' && (
            <TextAreaField
              label="Texto corrigido"
              required
              value={textoCorrigido}
              onChange={setTextoCorrigido}
              rows={6}
            />
          )}

          <CheckboxField
            label="Marcar alucinação (conteúdo não fundamentado)"
            checked={marcouAlucinacao}
            onChange={setMarcouAlucinacao}
          />
          <TextAreaField label="Justificativa" value={justificativa} onChange={setJustificativa} rows={3} />

          <button type="submit" className="gd-btn" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : 'Registrar anotação'}
          </button>
        </form>
      </div>
    </Card>
  );
}
