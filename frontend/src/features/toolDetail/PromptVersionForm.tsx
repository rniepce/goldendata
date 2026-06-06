/*
 * Cria nova versão de prompt (POST /registry/tools/{id}/prompt-versions).
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useCreatePromptVersion } from '../../lib/queries';
import { ErrorAlert, SuccessAlert, TextAreaField, TextField } from '../../components/ui';
import type { PromptVersionInput } from '../../lib/types';

export function PromptVersionForm({ toolId }: { toolId: string }): ReactNode {
  const mutation = useCreatePromptVersion(toolId);
  const [versao, setVersao] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [parentVersion, setParentVersion] = useState('');
  const [changelog, setChangelog] = useState('');

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const input: PromptVersionInput = {
      versao: versao.trim(),
      conteudo,
      parent_version: parentVersion.trim() || undefined,
      changelog: changelog.trim() || undefined,
    };
    mutation.mutate(input, {
      onSuccess: () => {
        setVersao('');
        setConteudo('');
        setParentVersion('');
        setChangelog('');
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {mutation.isError && <ErrorAlert error={mutation.error} />}
      {mutation.isSuccess && <SuccessAlert>Versão de prompt criada.</SuccessAlert>}
      <div className="gd-form-grid">
        <TextField label="Versão" required value={versao} onChange={setVersao} placeholder="ex.: 1.2.0" />
        <TextField label="Versão de origem (parent)" value={parentVersion} onChange={setParentVersion} />
      </div>
      <TextAreaField label="Conteúdo do prompt" required value={conteudo} onChange={setConteudo} rows={8} />
      <TextAreaField label="Changelog" value={changelog} onChange={setChangelog} rows={3} />
      <button type="submit" className="gd-btn" disabled={mutation.isPending}>
        {mutation.isPending ? 'Salvando…' : 'Adicionar versão de prompt'}
      </button>
    </form>
  );
}
