/*
 * Formulário de registro de ferramenta/agente (3.2 — POST /registry/tools).
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateTool } from '../../lib/queries';
import {
  CheckboxField,
  ErrorAlert,
  SelectField,
  SuccessAlert,
  TextAreaField,
  TextField,
} from '../../components/ui';
import { RISCO_OPTIONS, TIPO_OPTIONS, VEDACOES_ITENS } from '../../lib/options';
import type { CategoriaRisco, TipoFerramenta, ToolInput } from '../../lib/types';

export function ToolCreateForm({ onCreated }: { onCreated?: () => void }): ReactNode {
  const navigate = useNavigate();
  const mutation = useCreateTool();

  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoFerramenta>('ferramenta');
  const [descricao, setDescricao] = useState('');
  const [unidade, setUnidade] = useState('');
  const [risco, setRisco] = useState<CategoriaRisco | ''>('');
  const [justificativaRisco, setJustificativaRisco] = useState('');
  const [grauSupervisao, setGrauSupervisao] = useState('');
  const [revisaoObrigatoria, setRevisaoObrigatoria] = useState(true);
  const [explicacao, setExplicacao] = useState('');
  const [sinapsesId, setSinapsesId] = useState('');
  const [proximaRevisao, setProximaRevisao] = useState('');
  const [vedacoes, setVedacoes] = useState<Record<string, boolean>>({});

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const input: ToolInput = {
      codigo_institucional: codigo.trim(),
      nome: nome.trim(),
      tipo,
      descricao: descricao.trim() || undefined,
      unidade_responsavel: unidade.trim(),
      categoria_risco: risco || undefined,
      justificativa_risco: justificativaRisco.trim() || undefined,
      vedacoes_checklist: Object.keys(vedacoes).length > 0 ? vedacoes : undefined,
      grau_supervisao_humana: grauSupervisao.trim(),
      revisao_humana_obrigatoria: revisaoObrigatoria,
      explicacao_linguagem_simples: explicacao.trim() || undefined,
      sinapses_id: sinapsesId.trim() || undefined,
      proxima_revisao_em: proximaRevisao || undefined,
    };
    mutation.mutate(input, {
      onSuccess: (tool) => {
        onCreated?.();
        navigate(`/ferramentas/${tool.id}`);
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {mutation.isError && <ErrorAlert error={mutation.error} />}
      {mutation.isSuccess && <SuccessAlert>Ferramenta registrada com sucesso.</SuccessAlert>}

      <div className="gd-form-grid">
        <TextField label="Código institucional" required value={codigo} onChange={setCodigo} />
        <TextField label="Nome" required value={nome} onChange={setNome} />
        <SelectField
          label="Tipo"
          required
          value={tipo}
          onChange={(v) => setTipo(v as TipoFerramenta)}
          options={TIPO_OPTIONS}
        />
        <TextField
          label="Unidade responsável"
          required
          value={unidade}
          onChange={setUnidade}
        />
        <SelectField
          label="Categoria de risco"
          value={risco}
          onChange={(v) => setRisco(v as CategoriaRisco | '')}
          placeholder="Não classificado"
          options={RISCO_OPTIONS}
        />
        <TextField
          label="Próxima revisão em"
          type="date"
          value={proximaRevisao}
          onChange={setProximaRevisao}
        />
        <TextField
          label="Grau de supervisão humana"
          required
          value={grauSupervisao}
          onChange={setGrauSupervisao}
          hint="Ex.: supervisão integral, por amostragem, validação obrigatória"
        />
        <TextField label="ID Sinapses (CNJ)" value={sinapsesId} onChange={setSinapsesId} />
      </div>

      <TextAreaField label="Descrição" value={descricao} onChange={setDescricao} />
      <TextAreaField
        label="Justificativa do risco"
        value={justificativaRisco}
        onChange={setJustificativaRisco}
      />
      <TextAreaField
        label="Explicação em linguagem simples"
        value={explicacao}
        onChange={setExplicacao}
        hint="Descrição acessível ao cidadão sobre o que a ferramenta faz."
      />

      <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1rem' }}>
        <legend className="gd-legend">
          Checklist de vedações
        </legend>
        {VEDACOES_ITENS.map((item) => (
          <CheckboxField
            key={item.chave}
            label={item.rotulo}
            checked={Boolean(vedacoes[item.chave])}
            onChange={(checked) => setVedacoes((prev) => ({ ...prev, [item.chave]: checked }))}
          />
        ))}
      </fieldset>

      <CheckboxField
        label="Revisão humana obrigatória"
        checked={revisaoObrigatoria}
        onChange={setRevisaoObrigatoria}
      />

      <div className="gd-row" style={{ marginTop: '1rem' }}>
        <button type="submit" className="gd-btn" disabled={mutation.isPending}>
          {mutation.isPending ? 'Registrando…' : 'Registrar'}
        </button>
      </div>
    </form>
  );
}
