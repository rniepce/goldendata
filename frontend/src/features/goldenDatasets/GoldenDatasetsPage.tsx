/*
 * /golden-datasets — criação de rubricas e golden datasets, e editor de casos
 * (input + saída de referência + rubrica + citações canônicas).
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useTools, useCreateGoldenDataset, useCreateRubric } from '../../lib/queries';
import {
  Card,
  ErrorAlert,
  InfoAlert,
  PageHeader,
  SelectField,
  SuccessAlert,
  TextAreaField,
  TextField,
} from '../../components/ui';
import { DOMINIO_DATASET_OPTIONS, ESCALA_RUBRICA_OPTIONS } from '../../lib/options';
import type {
  DominioDataset,
  EscalaRubrica,
  GoldenDataset,
  GoldenDatasetInput,
  Rubric,
  RubricInput,
} from '../../lib/types';
import { GoldenCaseForm } from './GoldenCaseForm';

export function GoldenDatasetsPage(): ReactNode {
  const { data: tools } = useTools();
  const [rubricaCriada, setRubricaCriada] = useState<Rubric | null>(null);
  const [datasetCriado, setDatasetCriado] = useState<GoldenDataset | null>(null);

  return (
    <>
      <PageHeader
        title="Golden datasets"
        description="Conjuntos de referência para avaliação de qualidade, com casos de teste, rubricas e citações canônicas."
      />

      <RubricForm onCreated={setRubricaCriada} />

      <DatasetForm
        tools={(tools ?? []).map((t) => ({ id: t.id, nome: t.nome }))}
        onCreated={setDatasetCriado}
      />

      {datasetCriado ? (
        <Card title={`Casos do dataset: ${datasetCriado.nome} (${datasetCriado.versao})`}>
          <GoldenCaseForm datasetId={datasetCriado.id} rubrica={rubricaCriada} />
        </Card>
      ) : (
        <InfoAlert>Crie um golden dataset acima para começar a adicionar casos.</InfoAlert>
      )}
    </>
  );
}

function RubricForm({ onCreated }: { onCreated: (r: Rubric) => void }): ReactNode {
  const mutation = useCreateRubric();
  const [nome, setNome] = useState('');
  const [versao, setVersao] = useState('');
  const [escala, setEscala] = useState<EscalaRubrica>('binaria');

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const input: RubricInput = { nome: nome.trim(), versao: versao.trim(), escala };
    mutation.mutate(input, {
      onSuccess: (rubric) => {
        onCreated(rubric);
        setNome('');
        setVersao('');
      },
    });
  }

  return (
    <Card title="Rubrica de avaliação">
      <form onSubmit={handleSubmit} noValidate>
        {mutation.isError && <ErrorAlert error={mutation.error} />}
        {mutation.isSuccess && <SuccessAlert>Rubrica criada e selecionada para os casos.</SuccessAlert>}
        <div className="gd-form-grid">
          <TextField label="Nome" required value={nome} onChange={setNome} />
          <TextField label="Versão" required value={versao} onChange={setVersao} />
          <SelectField
            label="Escala"
            required
            value={escala}
            onChange={(v) => setEscala(v as EscalaRubrica)}
            options={ESCALA_RUBRICA_OPTIONS}
          />
        </div>
        <button type="submit" className="gd-btn" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando…' : 'Criar rubrica'}
        </button>
      </form>
    </Card>
  );
}

function DatasetForm({
  tools,
  onCreated,
}: {
  tools: { id: string; nome: string }[];
  onCreated: (d: GoldenDataset) => void;
}): ReactNode {
  const mutation = useCreateGoldenDataset();
  const [toolId, setToolId] = useState('');
  const [nome, setNome] = useState('');
  const [dominio, setDominio] = useState<DominioDataset>('minuta');
  const [versao, setVersao] = useState('');
  const [parentVersion, setParentVersion] = useState('');
  const [changelog, setChangelog] = useState('');
  const [origem, setOrigem] = useState('');

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const input: GoldenDatasetInput = {
      tool_id: toolId,
      nome: nome.trim(),
      dominio,
      versao: versao.trim(),
      parent_version: parentVersion.trim() || undefined,
      changelog: changelog.trim() || undefined,
      origem_predominante: origem.trim(),
    };
    mutation.mutate(input, { onSuccess: onCreated });
  }

  return (
    <Card title="Golden dataset">
      <form onSubmit={handleSubmit} noValidate>
        {mutation.isError && <ErrorAlert error={mutation.error} />}
        {mutation.isSuccess && <SuccessAlert>Dataset criado.</SuccessAlert>}
        <div className="gd-form-grid">
          <SelectField
            label="Ferramenta"
            required
            value={toolId}
            onChange={setToolId}
            placeholder="Selecione a ferramenta"
            options={tools.map((t) => ({ value: t.id, label: t.nome }))}
          />
          <TextField label="Nome" required value={nome} onChange={setNome} />
          <SelectField
            label="Domínio"
            required
            value={dominio}
            onChange={(v) => setDominio(v as DominioDataset)}
            options={DOMINIO_DATASET_OPTIONS}
          />
          <TextField label="Versão" required value={versao} onChange={setVersao} />
          <TextField label="Versão de origem (parent)" value={parentVersion} onChange={setParentVersion} />
          <TextField label="Origem predominante" required value={origem} onChange={setOrigem} />
        </div>
        <TextAreaField label="Changelog" value={changelog} onChange={setChangelog} rows={3} />
        <button type="submit" className="gd-btn" disabled={mutation.isPending || !toolId}>
          {mutation.isPending ? 'Salvando…' : 'Criar dataset'}
        </button>
      </form>
    </Card>
  );
}
