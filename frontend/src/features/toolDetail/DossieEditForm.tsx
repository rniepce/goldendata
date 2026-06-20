/*
 * Edição do Dossiê de Governança GEX-IA (#14): torna editáveis os campos que
 * antes eram somente-leitura (estágio, fase, status, analista, processo SEI,
 * riscos, próximos passos, próxima revisão…). PATCH /registry/tools/{id}.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useUpdateTool } from '../../lib/queries';
import {
  ErrorAlert,
  SuccessAlert,
  TextAreaField,
  TextField,
} from '../../components/ui';
import type { Tool, ToolUpdateInput } from '../../lib/types';

export function DossieEditForm({ tool, onDone }: { tool: Tool; onDone: () => void }): ReactNode {
  const update = useUpdateTool(tool.id);

  const [estagio, setEstagio] = useState(tool.estagio_gexia ?? '');
  const [fase, setFase] = useState(tool.fase_gexia ?? '');
  const [statusGov, setStatusGov] = useState(tool.status_governanca ?? '');
  const [analista, setAnalista] = useState(tool.analista_responsavel ?? '');
  const [riscoCnj, setRiscoCnj] = useState(tool.categoria_risco_cnj ?? '');
  const [desenvolvimento, setDesenvolvimento] = useState(tool.desenvolvimento ?? '');
  const [parceira, setParceira] = useState(tool.instituicao_parceira ?? '');
  const [processoSei, setProcessoSei] = useState(tool.processo_sei ?? '');
  const [dataAnalise, setDataAnalise] = useState(tool.data_analise ?? '');
  const [proximaRevisao, setProximaRevisao] = useState(tool.proxima_revisao_em ?? '');
  const [documentoOrigem, setDocumentoOrigem] = useState(tool.documento_origem ?? '');
  const [interfaces, setInterfaces] = useState(tool.interfaces_institucionais ?? '');
  const [proximosPassos, setProximosPassos] = useState(tool.proximos_passos ?? '');
  const [observacoes, setObservacoes] = useState(tool.observacoes ?? '');
  const [riscos, setRiscos] = useState((tool.riscos_identificados ?? []).join('\n'));

  function onSubmit(e: FormEvent): void {
    e.preventDefault();
    const input: ToolUpdateInput = {
      estagio_gexia: estagio.trim() || null,
      fase_gexia: fase.trim() || null,
      status_governanca: statusGov.trim() || null,
      analista_responsavel: analista.trim() || null,
      categoria_risco_cnj: riscoCnj.trim() || null,
      desenvolvimento: desenvolvimento.trim() || null,
      instituicao_parceira: parceira.trim() || null,
      processo_sei: processoSei.trim() || null,
      data_analise: dataAnalise || null,
      proxima_revisao_em: proximaRevisao || null,
      documento_origem: documentoOrigem.trim() || null,
      interfaces_institucionais: interfaces.trim() || null,
      proximos_passos: proximosPassos.trim() || null,
      observacoes: observacoes.trim() || null,
      riscos_identificados: riscos
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    update.mutate(input, { onSuccess: onDone });
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {update.isError && <ErrorAlert error={update.error} />}
      {update.isSuccess && <SuccessAlert>Dossiê atualizado.</SuccessAlert>}
      <div className="gd-form-grid">
        <TextField label="Estágio (GEX-IA)" value={estagio} onChange={setEstagio} />
        <TextField label="Fase de análise" value={fase} onChange={setFase} />
        <TextField label="Status da governança" value={statusGov} onChange={setStatusGov} />
        <TextField label="Analista responsável" value={analista} onChange={setAnalista} />
        <TextField label="Categoria de risco CNJ" value={riscoCnj} onChange={setRiscoCnj} hint="AR/BR granular" />
        <TextField label="Desenvolvimento" value={desenvolvimento} onChange={setDesenvolvimento} hint="Interno / Externo / Ambos" />
        <TextField label="Instituição parceira" value={parceira} onChange={setParceira} />
        <TextField label="Processo SEI" value={processoSei} onChange={setProcessoSei} />
        <TextField label="Data da análise" type="date" value={dataAnalise} onChange={setDataAnalise} />
        <TextField label="Próxima revisão em" type="date" value={proximaRevisao} onChange={setProximaRevisao} />
        <TextField label="Documento de origem" value={documentoOrigem} onChange={setDocumentoOrigem} />
      </div>
      <TextAreaField label="Interfaces institucionais" value={interfaces} onChange={setInterfaces} rows={2} />
      <TextAreaField label="Próximos passos" value={proximosPassos} onChange={setProximosPassos} rows={3} />
      <TextAreaField
        label="Riscos identificados"
        value={riscos}
        onChange={setRiscos}
        rows={4}
        hint="Um risco por linha."
      />
      <TextAreaField label="Observações" value={observacoes} onChange={setObservacoes} rows={3} />
      <div className="gd-row" style={{ marginTop: '1rem' }}>
        <button type="submit" className="gd-btn" disabled={update.isPending}>
          {update.isPending ? 'Salvando…' : 'Salvar dossiê'}
        </button>
        <button type="button" className="gd-btn gd-btn--secondary" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
