/*
 * Editor de casos do golden dataset
 * (POST /evaluation/golden-datasets/{datasetId}/cases).
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useCreateGoldenCase } from '../../lib/queries';
import {
  CheckboxField,
  ErrorAlert,
  SelectField,
  SuccessAlert,
  TextAreaField,
  TextField,
} from '../../components/ui';
import { splitList, parseJsonObject } from '../../lib/json';
import { RISCO_OPTIONS } from '../../lib/options';
import type { GoldenCaseInput, Rubric } from '../../lib/types';

export function GoldenCaseForm({
  datasetId,
  rubrica,
}: {
  datasetId: string;
  rubrica: Rubric | null;
}): ReactNode {
  const mutation = useCreateGoldenCase(datasetId);

  const [inputPrompt, setInputPrompt] = useState('');
  const [saidaReferencia, setSaidaReferencia] = useState('');
  const [contextoText, setContextoText] = useState('');
  const [criterios, setCriterios] = useState('');
  const [dificuldade, setDificuldade] = useState('3');
  const [categoriaRisco, setCategoriaRisco] = useState('');
  const [origem, setOrigem] = useState('');
  const [citacoes, setCitacoes] = useState('');
  const [contemPii, setContemPii] = useState(false);
  const [contextoError, setContextoError] = useState<string | null>(null);
  const [casosAdicionados, setCasosAdicionados] = useState(0);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setContextoError(null);

    let contexto: Record<string, unknown> | undefined;
    if (contextoText.trim()) {
      const parsed = parseJsonObject(contextoText);
      if (!parsed.ok) {
        setContextoError(parsed.error);
        return;
      }
      contexto = parsed.value;
    }

    const input: GoldenCaseInput = {
      input_prompt: inputPrompt,
      saida_referencia: saidaReferencia,
      contexto_grounding: contexto,
      rubrica_id: rubrica?.id,
      criterios_aceitacao: criterios.trim() || undefined,
      dificuldade: dificuldade ? Number(dificuldade) : undefined,
      categoria_risco: categoriaRisco || undefined,
      contem_pii: contemPii,
      origem: origem.trim(),
      citacoes_canonicas: citacoes.trim() ? splitList(citacoes) : undefined,
    };

    mutation.mutate(input, {
      onSuccess: () => {
        setCasosAdicionados((n) => n + 1);
        setInputPrompt('');
        setSaidaReferencia('');
        setContextoText('');
        setCriterios('');
        setCitacoes('');
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {mutation.isError && <ErrorAlert error={mutation.error} />}
      {mutation.isSuccess && (
        <SuccessAlert>
          Caso adicionado. Total nesta sessão: {casosAdicionados}.
        </SuccessAlert>
      )}
      <p style={{ color: 'var(--gd-color-text-muted)', fontSize: 'var(--gd-font-size-sm)' }}>
        Rubrica selecionada: {rubrica ? `${rubrica.nome} (${rubrica.versao})` : 'nenhuma'}
      </p>

      <TextAreaField
        label="Input / prompt"
        required
        value={inputPrompt}
        onChange={setInputPrompt}
        rows={5}
      />
      <TextAreaField
        label="Saída de referência"
        required
        value={saidaReferencia}
        onChange={setSaidaReferencia}
        rows={6}
      />
      <TextAreaField
        label="Contexto de grounding (JSON)"
        value={contextoText}
        onChange={setContextoText}
        hint='Objeto JSON opcional com o contexto fornecido ao modelo.'
        rows={4}
      />
      {contextoError && <ErrorAlert error={new Error(contextoError)} />}

      <div className="gd-form-grid">
        <SelectField
          label="Dificuldade (1-5)"
          value={dificuldade}
          onChange={setDificuldade}
          options={['1', '2', '3', '4', '5'].map((n) => ({ value: n, label: n }))}
        />
        <SelectField
          label="Categoria de risco"
          value={categoriaRisco}
          onChange={setCategoriaRisco}
          placeholder="Não classificado"
          options={RISCO_OPTIONS}
        />
        <TextField label="Origem" required value={origem} onChange={setOrigem} />
      </div>

      <TextAreaField label="Critérios de aceitação" value={criterios} onChange={setCriterios} rows={3} />
      <TextAreaField
        label="Citações canônicas"
        value={citacoes}
        onChange={setCitacoes}
        hint="Uma por linha ou separadas por vírgula (ex.: súmulas, dispositivos legais)."
        rows={3}
      />
      <CheckboxField label="Contém PII (dados pessoais)" checked={contemPii} onChange={setContemPii} />

      <button type="submit" className="gd-btn" disabled={mutation.isPending}>
        {mutation.isPending ? 'Salvando…' : 'Adicionar caso'}
      </button>
    </form>
  );
}
