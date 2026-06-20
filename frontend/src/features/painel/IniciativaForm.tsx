import { useState, type FormEvent, type ReactNode } from 'react';
import { Card, ErrorAlert, SelectField, TextAreaField, TextField } from '../../components/ui';
import {
  CATEGORIA_OPTIONS,
  MEMBROS_GEXIA,
  PRIORIDADE_OPTIONS,
  STATUS_INICIATIVA_OPTIONS,
} from '../../lib/options';
import { useCreateIniciativa } from '../../lib/queries';
import type { IniciativaCategoria, IniciativaPrioridade, IniciativaStatus } from '../../lib/types';

const RESP_OPTIONS = [
  { value: '', label: 'Sem responsável' },
  ...MEMBROS_GEXIA.map((m) => ({ value: m.email, label: m.nome })),
];

const CATEGORIAS_VALIDAS: IniciativaCategoria[] = [
  'solucao_ia',
  'educacional',
  'suporte',
  'governanca_normativo',
  'cooperacao',
  'pesquisa_prospeccao',
];

/** Valores iniciais opcionais (ex.: pré-preenchimento a partir de documento, #77). */
export interface IniciativaInicial {
  titulo?: string;
  resumo?: string;
  categoria?: string;
  processo_sei?: string;
}

export function IniciativaForm({
  onCreated,
  inicial,
}: {
  onCreated: () => void;
  inicial?: IniciativaInicial;
}): ReactNode {
  const create = useCreateIniciativa();
  const catInicial =
    inicial?.categoria && CATEGORIAS_VALIDAS.includes(inicial.categoria as IniciativaCategoria)
      ? (inicial.categoria as IniciativaCategoria)
      : 'solucao_ia';
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '');
  const [resumo, setResumo] = useState(inicial?.resumo ?? '');
  const [categoria, setCategoria] = useState<IniciativaCategoria>(catInicial);
  const [status, setStatus] = useState<IniciativaStatus>('a_fazer');
  const [prioridade, setPrioridade] = useState<IniciativaPrioridade>('media');
  const [respEmail, setRespEmail] = useState('');
  const [prazo, setPrazo] = useState('');
  const [processoSei, setProcessoSei] = useState(inicial?.processo_sei ?? '');

  function onSubmit(e: FormEvent): void {
    e.preventDefault();
    const nome = MEMBROS_GEXIA.find((m) => m.email === respEmail)?.nome ?? null;
    create.mutate(
      {
        titulo: titulo.trim(),
        resumo: resumo.trim() || null,
        categoria,
        status,
        prioridade,
        responsavel_email: respEmail || null,
        responsavel_nome: nome,
        processo_sei: processoSei.trim() || null,
        prazo: prazo || null,
      },
      { onSuccess: onCreated },
    );
  }

  return (
    <Card title="Nova iniciativa">
      <form onSubmit={onSubmit} noValidate>
        {create.isError && <ErrorAlert error={create.error} />}
        <TextField label="Título" required value={titulo} onChange={setTitulo} />
        <TextAreaField label="Resumo" value={resumo} onChange={setResumo} hint="Aparece ao passar o mouse no card." />
        <div className="gd-form-grid">
          <SelectField label="Categoria" required value={categoria} onChange={(v) => setCategoria(v as IniciativaCategoria)} options={CATEGORIA_OPTIONS} />
          <SelectField label="Status" value={status} onChange={(v) => setStatus(v as IniciativaStatus)} options={STATUS_INICIATIVA_OPTIONS} />
          <SelectField label="Prioridade" value={prioridade} onChange={(v) => setPrioridade(v as IniciativaPrioridade)} options={PRIORIDADE_OPTIONS} />
          <SelectField label="Responsável" value={respEmail} onChange={setRespEmail} options={RESP_OPTIONS} />
          <TextField label="Prazo" type="date" value={prazo} onChange={setPrazo} />
          <TextField label="Processo SEI" value={processoSei} onChange={setProcessoSei} />
        </div>
        <button type="submit" className="gd-btn" disabled={create.isPending || !titulo.trim()}>
          {create.isPending ? 'Criando…' : 'Criar iniciativa'}
        </button>
      </form>
    </Card>
  );
}
