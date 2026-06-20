/*
 * Formulário de documento da base de conhecimento (criar/editar).
 * Aceita colar Markdown/texto ou importar um arquivo .md/.txt. Ao salvar, o
 * backend reindexa (fatia em chunks) para o RAG.
 */

import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useCreateDocumento, useUpdateDocumento } from '../../lib/queries';
import {
  CheckboxField,
  ErrorAlert,
  SelectField,
  SuccessAlert,
  TextAreaField,
  TextField,
} from '../../components/ui';
import type { Documento, DocumentoInput, DocumentoTipo } from '../../lib/types';

const TIPO_OPTIONS = [
  { value: 'skill', label: 'Skill / instrução' },
  { value: 'diretriz', label: 'Diretriz / política' },
  { value: 'norma', label: 'Norma / resolução' },
  { value: 'modelo_resposta', label: 'Modelo de resposta' },
  { value: 'outro', label: 'Outro' },
];

export function DocumentoForm({
  documento,
  onDone,
}: {
  documento?: Documento;
  onDone?: () => void;
}): ReactNode {
  const editing = Boolean(documento);
  const createM = useCreateDocumento();
  const updateM = useUpdateDocumento();
  const mutation = editing ? updateM : createM;

  const [titulo, setTitulo] = useState(documento?.titulo ?? '');
  const [tipo, setTipo] = useState<DocumentoTipo>(documento?.tipo ?? 'skill');
  const [fonte, setFonte] = useState(documento?.fonte ?? '');
  const [tags, setTags] = useState((documento?.tags ?? []).join(', '));
  const [conteudo, setConteudo] = useState(documento?.conteudo ?? '');
  const [ativo, setAtivo] = useState(documento?.ativo ?? true);

  async function handleFile(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const f = e.target.files?.[0];
    if (!f) return;
    const txt = await f.text();
    setConteudo(txt);
    if (!titulo.trim()) setTitulo(f.name.replace(/\.(md|markdown|txt)$/i, ''));
    e.target.value = '';
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const input: DocumentoInput = {
      titulo: titulo.trim(),
      tipo,
      conteudo,
      fonte: fonte.trim() || null,
      tags: tags
        .split(/[,\n]/)
        .map((t) => t.trim())
        .filter(Boolean),
      ativo,
    };
    if (editing && documento) {
      updateM.mutate({ id: documento.id, input }, { onSuccess: () => onDone?.() });
    } else {
      createM.mutate(input, { onSuccess: () => onDone?.() });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {mutation.isError && <ErrorAlert error={mutation.error} />}
      {mutation.isSuccess && (
        <SuccessAlert>Documento {editing ? 'atualizado' : 'criado'} e reindexado.</SuccessAlert>
      )}

      <div className="gd-form-grid">
        <TextField label="Título" required value={titulo} onChange={setTitulo} />
        <SelectField
          label="Tipo"
          value={tipo}
          onChange={(v) => setTipo(v as DocumentoTipo)}
          options={TIPO_OPTIONS}
        />
        <TextField
          label="Fonte"
          value={fonte}
          onChange={setFonte}
          hint="Origem: URL, processo SEI, arquivo…"
        />
        <TextField label="Tags" value={tags} onChange={setTags} hint="Separadas por vírgula" />
      </div>

      <div className="gd-field">
        <label htmlFor="doc-file-import">Importar arquivo (.md/.txt)</label>
        <input
          id="doc-file-import"
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          onChange={(e) => void handleFile(e)}
        />
        <span className="gd-field__hint">O conteúdo do arquivo substitui o campo abaixo.</span>
      </div>

      <TextAreaField
        label="Conteúdo (Markdown/texto)"
        required
        rows={14}
        value={conteudo}
        onChange={setConteudo}
        hint="Será fatiado em trechos e indexado para o assistente citar como fonte."
      />

      <CheckboxField
        label="Ativo (incluído nas respostas do assistente)"
        checked={ativo}
        onChange={setAtivo}
      />

      <div className="gd-row" style={{ marginTop: '1rem' }}>
        <button
          type="submit"
          className="gd-btn"
          disabled={mutation.isPending || !titulo.trim() || !conteudo.trim()}
        >
          {mutation.isPending ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar documento'}
        </button>
        {onDone && (
          <button type="button" className="gd-btn gd-btn--secondary" onClick={onDone}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
