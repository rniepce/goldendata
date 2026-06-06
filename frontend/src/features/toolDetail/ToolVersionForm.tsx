/*
 * Cria nova versão da ferramenta (POST /registry/tools/{id}/versions),
 * referenciando modelo-base e, opcionalmente, versão de prompt.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useCreateToolVersion, useModelBases } from '../../lib/queries';
import {
  ErrorAlert,
  InfoAlert,
  SelectField,
  SuccessAlert,
  TextAreaField,
  TextField,
} from '../../components/ui';
import type { PromptVersion, ToolVersionInput } from '../../lib/types';
import { parseJsonObject } from '../../lib/json';

export function ToolVersionForm({
  toolId,
  promptVersions,
}: {
  toolId: string;
  promptVersions: PromptVersion[];
}): ReactNode {
  const mutation = useCreateToolVersion(toolId);
  const { data: modelBases, isLoading: loadingBases } = useModelBases();

  const [versao, setVersao] = useState('');
  const [modelBaseId, setModelBaseId] = useState('');
  const [promptVersionId, setPromptVersionId] = useState('');
  const [gitCommit, setGitCommit] = useState('');
  const [changelog, setChangelog] = useState('');
  const [configText, setConfigText] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setConfigError(null);

    let config: Record<string, unknown> | undefined;
    if (configText.trim()) {
      const parsed = parseJsonObject(configText);
      if (!parsed.ok) {
        setConfigError(parsed.error);
        return;
      }
      config = parsed.value;
    }

    const input: ToolVersionInput = {
      versao: versao.trim(),
      model_base_id: modelBaseId,
      prompt_version_id: promptVersionId || undefined,
      config,
      git_commit: gitCommit.trim() || undefined,
      changelog: changelog.trim() || undefined,
    };
    mutation.mutate(input, {
      onSuccess: () => {
        setVersao('');
        setGitCommit('');
        setChangelog('');
        setConfigText('');
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {mutation.isError && <ErrorAlert error={mutation.error} />}
      {mutation.isSuccess && <SuccessAlert>Versão da ferramenta criada.</SuccessAlert>}
      {!loadingBases && (modelBases?.length ?? 0) === 0 && (
        <InfoAlert>
          Nenhum modelo-base cadastrado ainda. Cadastre um modelo-base antes de criar a versão.
        </InfoAlert>
      )}

      <div className="gd-form-grid">
        <TextField label="Versão" required value={versao} onChange={setVersao} placeholder="ex.: 2.0.0" />
        <SelectField
          label="Modelo-base"
          required
          value={modelBaseId}
          onChange={setModelBaseId}
          placeholder="Selecione o modelo-base"
          options={(modelBases ?? []).map((mb) => ({
            value: mb.id,
            label: `${mb.provedor} · ${mb.nome} ${mb.versao}`,
          }))}
        />
        <SelectField
          label="Versão de prompt"
          value={promptVersionId}
          onChange={setPromptVersionId}
          placeholder="Sem prompt associado"
          options={promptVersions.map((p) => ({ value: p.id, label: p.versao }))}
        />
        <TextField label="Git commit" value={gitCommit} onChange={setGitCommit} />
      </div>
      <TextAreaField
        label="Configuração (JSON)"
        value={configText}
        onChange={setConfigText}
        hint='Objeto JSON opcional, ex.: {"temperatura": 0.2, "max_tokens": 1024}'
        rows={4}
      />
      {configError && <ErrorAlert error={new Error(configError)} />}
      <TextAreaField label="Changelog" value={changelog} onChange={setChangelog} rows={3} />
      <button type="submit" className="gd-btn" disabled={mutation.isPending || !modelBaseId}>
        {mutation.isPending ? 'Salvando…' : 'Adicionar versão da ferramenta'}
      </button>
    </form>
  );
}
