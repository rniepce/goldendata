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

export function IniciativaForm({ onCreated }: { onCreated: () => void }): ReactNode {
  const create = useCreateIniciativa();
  const [titulo, setTitulo] = useState('');
  const [resumo, setResumo] = useState('');
  const [categoria, setCategoria] = useState<IniciativaCategoria>('solucao_ia');
  const [status, setStatus] = useState<IniciativaStatus>('a_fazer');
  const [prioridade, setPrioridade] = useState<IniciativaPrioridade>('media');
  const [respEmail, setRespEmail] = useState('');
  const [prazo, setPrazo] = useState('');

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
        </div>
        <button type="submit" className="gd-btn" disabled={create.isPending || !titulo.trim()}>
          {create.isPending ? 'Criando…' : 'Criar iniciativa'}
        </button>
      </form>
    </Card>
  );
}
