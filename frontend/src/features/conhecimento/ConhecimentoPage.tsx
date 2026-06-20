/*
 * /conhecimento — Base de conhecimento do GEX-IA (corpus do RAG).
 * Documentos institucionais (skills, diretrizes, normas, modelos) que o
 * assistente usa como fonte citável. Leitura para todos; curadoria
 * (criar/editar/excluir/reindexar) restrita a coordenador/admin.
 */

import { useState, type ReactNode } from 'react';
import { useAuth, hasAnyRole } from '../../lib/auth-oidc';
import {
  useDeleteDocumento,
  useDocumento,
  useDocumentos,
  useReindexDocumento,
} from '../../lib/queries';
import {
  Badge,
  Card,
  EmptyState,
  ErrorAlert,
  InfoAlert,
  Loading,
  PageHeader,
  SelectField,
  TextField,
} from '../../components/ui';
import { DocumentoForm } from './DocumentoForm';
import type { DocumentoTipo } from '../../lib/types';

const TIPO_LABEL: Record<DocumentoTipo, string> = {
  skill: 'Skill',
  diretriz: 'Diretriz',
  norma: 'Norma',
  modelo_resposta: 'Modelo',
  outro: 'Outro',
};

const TIPO_FILTRO = [
  { value: 'skill', label: 'Skill / instrução' },
  { value: 'diretriz', label: 'Diretriz / política' },
  { value: 'norma', label: 'Norma / resolução' },
  { value: 'modelo_resposta', label: 'Modelo de resposta' },
  { value: 'outro', label: 'Outro' },
];

function EditarDocumento({ id, onDone }: { id: string; onDone: () => void }): ReactNode {
  const { data, isLoading, isError, error } = useDocumento(id);
  if (isLoading) return <Loading label="Carregando documento…" />;
  if (isError) return <ErrorAlert error={error} />;
  if (!data) return null;
  return <DocumentoForm documento={data} onDone={onDone} />;
}

export function ConhecimentoPage(): ReactNode {
  const { user } = useAuth();
  const podeEditar = hasAnyRole(user, 'coordenador_comite', 'admin');

  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const { data, isLoading, isError, error } = useDocumentos({
    tipo: tipo || undefined,
    q: q || undefined,
  });

  const [criando, setCriando] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const delM = useDeleteDocumento();
  const reM = useReindexDocumento();

  function abrirCriar(): void {
    setEditId(null);
    setCriando((v) => !v);
  }
  function abrirEditar(id: string): void {
    setCriando(false);
    setEditId((cur) => (cur === id ? null : id));
  }
  function excluir(id: string, titulo: string): void {
    if (window.confirm(`Excluir o documento “${titulo}”? Esta ação remove-o do RAG.`)) {
      delM.mutate(id);
    }
  }

  return (
    <>
      <PageHeader
        title="Base de conhecimento"
        description="Documentos institucionais do GEX-IA (skills, diretrizes, normas, modelos) que fundamentam as respostas do assistente, com citação de fonte."
        actions={
          podeEditar && (
            <button type="button" className="gd-btn" onClick={abrirCriar}>
              {criando ? 'Fechar formulário' : 'Novo documento'}
            </button>
          )
        }
      />

      {!podeEditar && (
        <InfoAlert>
          Você pode consultar a base. A curadoria (incluir/editar documentos) é feita por
          coordenador ou administrador.
        </InfoAlert>
      )}

      {criando && podeEditar && (
        <Card title="Novo documento">
          <DocumentoForm onDone={() => setCriando(false)} />
        </Card>
      )}

      {editId && podeEditar && (
        <Card title="Editar documento">
          <EditarDocumento id={editId} onDone={() => setEditId(null)} />
        </Card>
      )}

      <Card>
        <div className="gd-toolbar">
          <div style={{ flex: 1, minWidth: 220 }}>
            <TextField label="Buscar" value={q} onChange={setQ} placeholder="Título ou conteúdo…" />
          </div>
          <div style={{ minWidth: 200 }}>
            <SelectField
              label="Filtrar por tipo"
              value={tipo}
              onChange={setTipo}
              placeholder="Todos os tipos"
              options={TIPO_FILTRO}
            />
          </div>
        </div>

        {isLoading && <Loading label="Carregando base de conhecimento…" />}
        {isError && <ErrorAlert error={error} />}

        {!isLoading && !isError && (data?.length ?? 0) === 0 && (
          <EmptyState>Nenhum documento encontrado. Comece incluindo as diretrizes do GEX-IA.</EmptyState>
        )}

        {!isLoading && !isError && data && data.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="gd-table">
              <caption className="gd-visually-hidden">Documentos da base de conhecimento</caption>
              <thead>
                <tr>
                  <th scope="col">Título</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Tags</th>
                  <th scope="col">Status</th>
                  <th scope="col">Trechos</th>
                  {podeEditar && <th scope="col">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.titulo}</td>
                    <td>
                      <Badge tone="info">{TIPO_LABEL[doc.tipo]}</Badge>
                    </td>
                    <td className="gd-mono" style={{ fontSize: '0.8rem' }}>
                      {doc.tags.length > 0 ? doc.tags.join(', ') : '—'}
                    </td>
                    <td>
                      <Badge tone={doc.ativo ? 'success' : 'neutral'}>
                        {doc.ativo ? 'ativo' : 'inativo'}
                      </Badge>
                    </td>
                    <td>{doc.n_chunks ?? 0}</td>
                    {podeEditar && (
                      <td>
                        <div className="gd-row">
                          <button
                            type="button"
                            className="gd-btn gd-btn--secondary gd-btn--sm"
                            onClick={() => abrirEditar(doc.id)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="gd-btn gd-btn--text gd-btn--sm"
                            onClick={() => reM.mutate(doc.id)}
                            disabled={reM.isPending}
                            title="Refatiar e reindexar o documento"
                          >
                            Reindexar
                          </button>
                          <button
                            type="button"
                            className="gd-btn gd-btn--text gd-btn--sm"
                            onClick={() => excluir(doc.id, doc.titulo)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    )}
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
