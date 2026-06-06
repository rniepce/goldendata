/*
 * Cria item de inventário de dados / LGPD
 * (POST /registry/tools/{id}/data-inventory).
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useCreateDataInventory } from '../../lib/queries';
import {
  CheckboxField,
  ErrorAlert,
  SelectField,
  SuccessAlert,
  TextAreaField,
  TextField,
} from '../../components/ui';
import { BASE_LEGAL_OPTIONS, NATUREZA_DADO_OPTIONS } from '../../lib/options';
import { splitList } from '../../lib/json';
import type { BaseLegal, DataInventoryInput, NaturezaDado } from '../../lib/types';

export function DataInventoryForm({ toolId }: { toolId: string }): ReactNode {
  const mutation = useCreateDataInventory(toolId);

  const [natureza, setNatureza] = useState<NaturezaDado>('rag_base');
  const [origem, setOrigem] = useState('');
  const [categorias, setCategorias] = useState('');
  const [baseLegal, setBaseLegal] = useState<BaseLegal>('funcao_jurisdicional');
  const [retencao, setRetencao] = useState('');
  const [descarte, setDescarte] = useState('');
  const [pessoais, setPessoais] = useState(false);
  const [sensiveis, setSensiveis] = useState(false);
  const [criancas, setCriancas] = useState(false);
  const [sigilo, setSigilo] = useState(false);
  const [finalidadeJurisdicional, setFinalidadeJurisdicional] = useState(true);
  const [ripd, setRipd] = useState(false);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const input: DataInventoryInput = {
      natureza,
      origem: origem.trim(),
      categorias_dados: splitList(categorias),
      contem_dados_pessoais: pessoais,
      contem_dados_sensiveis: sensiveis,
      contem_dados_criancas: criancas,
      contem_sigilo: sigilo,
      base_legal: baseLegal,
      retencao_criterio: retencao.trim() || undefined,
      descarte_programado_em: descarte || undefined,
      finalidade_exclusiva_jurisdicional: finalidadeJurisdicional,
      ripd_requerido: ripd,
    };
    mutation.mutate(input, {
      onSuccess: () => {
        setOrigem('');
        setCategorias('');
        setRetencao('');
        setDescarte('');
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {mutation.isError && <ErrorAlert error={mutation.error} />}
      {mutation.isSuccess && <SuccessAlert>Item de inventário registrado.</SuccessAlert>}

      <div className="gd-form-grid">
        <SelectField
          label="Natureza dos dados"
          required
          value={natureza}
          onChange={(v) => setNatureza(v as NaturezaDado)}
          options={NATUREZA_DADO_OPTIONS}
        />
        <TextField label="Origem" required value={origem} onChange={setOrigem} />
        <SelectField
          label="Base legal (LGPD)"
          required
          value={baseLegal}
          onChange={(v) => setBaseLegal(v as BaseLegal)}
          options={BASE_LEGAL_OPTIONS}
        />
        <TextField
          label="Descarte programado em"
          type="date"
          value={descarte}
          onChange={setDescarte}
        />
      </div>

      <TextAreaField
        label="Categorias de dados"
        required
        value={categorias}
        onChange={setCategorias}
        hint="Uma por linha ou separadas por vírgula."
        rows={3}
      />
      <TextField label="Critério de retenção" value={retencao} onChange={setRetencao} />

      <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1rem' }}>
        <legend style={{ fontWeight: 600, fontSize: 'var(--gd-font-size-sm)', marginBottom: '0.5rem' }}>
          Classificação de sensibilidade
        </legend>
        <CheckboxField label="Contém dados pessoais" checked={pessoais} onChange={setPessoais} />
        <CheckboxField label="Contém dados sensíveis" checked={sensiveis} onChange={setSensiveis} />
        <CheckboxField label="Contém dados de crianças/adolescentes" checked={criancas} onChange={setCriancas} />
        <CheckboxField label="Contém dados sob sigilo" checked={sigilo} onChange={setSigilo} />
        <CheckboxField
          label="Finalidade exclusivamente jurisdicional"
          checked={finalidadeJurisdicional}
          onChange={setFinalidadeJurisdicional}
        />
        <CheckboxField label="RIPD requerido" checked={ripd} onChange={setRipd} />
      </fieldset>

      <button type="submit" className="gd-btn" disabled={mutation.isPending}>
        {mutation.isPending ? 'Salvando…' : 'Adicionar item de inventário'}
      </button>
    </form>
  );
}
