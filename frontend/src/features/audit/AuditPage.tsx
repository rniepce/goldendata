/*
 * /auditoria — trilha de auditoria com filtros e verificação de integridade
 * da cadeia (hash encadeado). Diretriz CESEC: logs com integridade verificável.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queries';
import {
  Badge,
  Card,
  EmptyState,
  ErrorAlert,
  Loading,
  PageHeader,
  SuccessAlert,
  TextField,
} from '../../components/ui';
import type { AuditVerifyResult } from '../../lib/types';

export function AuditPage(): ReactNode {
  const [searchParams] = useSearchParams();
  const [entidade, setEntidade] = useState(searchParams.get('entidade') ?? '');
  const [entidadeId, setEntidadeId] = useState(searchParams.get('entidade_id') ?? '');
  const [limite, setLimite] = useState('100');
  const [filtros, setFiltros] = useState({
    entidade: searchParams.get('entidade') ?? '',
    entidadeId: searchParams.get('entidade_id') ?? '',
    limite: 100,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.auditLog(filtros.entidade, filtros.entidadeId),
    queryFn: () =>
      api.getAuditLog({
        entidade: filtros.entidade || undefined,
        entidade_id: filtros.entidadeId || undefined,
        limite: filtros.limite,
      }),
  });

  const [verificacao, setVerificacao] = useState<AuditVerifyResult | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [verifyError, setVerifyError] = useState<unknown>(null);

  function aplicarFiltros(event: FormEvent): void {
    event.preventDefault();
    setFiltros({
      entidade: entidade.trim(),
      entidadeId: entidadeId.trim(),
      limite: Number(limite) || 100,
    });
  }

  async function verificarIntegridade(): Promise<void> {
    setVerificando(true);
    setVerifyError(null);
    setVerificacao(null);
    try {
      const resultado = await api.verifyAuditChain();
      setVerificacao(resultado);
    } catch (err) {
      setVerifyError(err);
    } finally {
      setVerificando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Trilha de auditoria"
        description="Registros imutáveis de ações sobre as entidades da plataforma, encadeados por hash para garantir integridade."
        actions={
          <button
            type="button"
            className="gd-btn"
            onClick={() => void verificarIntegridade()}
            disabled={verificando}
          >
            {verificando ? 'Verificando…' : 'Verificar integridade da cadeia'}
          </button>
        }
      />

      {verifyError && <ErrorAlert error={verifyError} />}
      {verificacao &&
        (verificacao.intacta ? (
          <SuccessAlert>
            Cadeia íntegra. {verificacao.total} registros verificados sem quebras.
          </SuccessAlert>
        ) : (
          <div className="gd-alert gd-alert--error" role="alert">
            <strong>Cadeia comprometida!</strong> {verificacao.quebras.length} quebra(s) em{' '}
            {verificacao.total} registros.
            <ul style={{ marginBottom: 0 }}>
              {verificacao.quebras.map((quebra) => (
                <li key={quebra.id} className="gd-mono">
                  {quebra.id}
                  {quebra.motivo ? ` — ${quebra.motivo}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ))}

      <Card title="Filtros">
        <form className="gd-toolbar" onSubmit={aplicarFiltros}>
          <div style={{ minWidth: 180 }}>
            <TextField label="Entidade" value={entidade} onChange={setEntidade} placeholder="ex.: tool" />
          </div>
          <div style={{ minWidth: 220 }}>
            <TextField label="ID da entidade" value={entidadeId} onChange={setEntidadeId} />
          </div>
          <div style={{ minWidth: 120 }}>
            <TextField label="Limite" type="number" value={limite} onChange={setLimite} />
          </div>
          <button type="submit" className="gd-btn gd-btn--secondary" style={{ alignSelf: 'flex-end' }}>
            Aplicar
          </button>
        </form>
      </Card>

      <Card title="Registros">
        {isLoading && <Loading label="Carregando trilha…" />}
        {isError && <ErrorAlert error={error} />}
        {data && data.length === 0 && <EmptyState>Nenhum registro de auditoria encontrado.</EmptyState>}
        {data && data.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="gd-table">
              <thead>
                <tr>
                  <th scope="col">Quando</th>
                  <th scope="col">Quem</th>
                  <th scope="col">Ação</th>
                  <th scope="col">Entidade</th>
                  <th scope="col">Hash</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.ocorrido_em).toLocaleString('pt-BR')}</td>
                    <td>{entry.ator_nome ?? entry.ator_sub ?? '—'}</td>
                    <td>
                      <Badge tone="info">{entry.acao}</Badge>
                    </td>
                    <td>
                      {entry.entidade} <span className="gd-mono">#{entry.entidade_id}</span>
                    </td>
                    <td className="gd-mono" title={entry.hash_atual}>
                      {entry.hash_atual ? `${entry.hash_atual.slice(0, 12)}…` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
