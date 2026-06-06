/*
 * /catalogo — lista de ferramentas/agentes com filtros por risco e tipo,
 * e criação de nova ferramenta (somente owner/coordenador/admin).
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, hasAnyRole } from '../../lib/auth-oidc';
import { useTools } from '../../lib/queries';
import {
  Badge,
  Card,
  EmptyState,
  ErrorAlert,
  Loading,
  PageHeader,
  RiskBadge,
  SelectField,
} from '../../components/ui';
import { ToolCreateForm } from './ToolCreateForm';

export function CatalogPage(): ReactNode {
  const { user } = useAuth();
  const { data: tools, isLoading, isError, error } = useTools();
  const [filtroRisco, setFiltroRisco] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [criando, setCriando] = useState(false);

  const podeCriar = hasAnyRole(user, 'owner_ferramenta', 'coordenador_comite', 'admin');

  const filtradas = useMemo(() => {
    if (!tools) return [];
    return tools.filter(
      (t) =>
        (!filtroRisco || t.categoria_risco === filtroRisco) &&
        (!filtroTipo || t.tipo === filtroTipo),
    );
  }, [tools, filtroRisco, filtroTipo]);

  return (
    <>
      <PageHeader
        title="Catálogo de ferramentas e agentes"
        description="Inventário institucional de soluções de IA registradas, com classificação de risco e status."
        actions={
          podeCriar && (
            <button type="button" className="gd-btn" onClick={() => setCriando((v) => !v)}>
              {criando ? 'Fechar formulário' : 'Registrar ferramenta'}
            </button>
          )
        }
      />

      {criando && podeCriar && (
        <Card title="Nova ferramenta / agente">
          <ToolCreateForm onCreated={() => setCriando(false)} />
        </Card>
      )}

      <Card>
        <div className="gd-toolbar">
          <div style={{ minWidth: 200 }}>
            <SelectField
              label="Filtrar por risco"
              value={filtroRisco}
              onChange={setFiltroRisco}
              placeholder="Todos os riscos"
              options={[
                { value: 'alto', label: 'Alto' },
                { value: 'baixo', label: 'Baixo' },
              ]}
            />
          </div>
          <div style={{ minWidth: 200 }}>
            <SelectField
              label="Filtrar por tipo"
              value={filtroTipo}
              onChange={setFiltroTipo}
              placeholder="Todos os tipos"
              options={[
                { value: 'ferramenta', label: 'Ferramenta' },
                { value: 'agente', label: 'Agente' },
              ]}
            />
          </div>
        </div>

        {isLoading && <Loading label="Carregando catálogo…" />}
        {isError && <ErrorAlert error={error} />}

        {!isLoading && !isError && filtradas.length === 0 && (
          <EmptyState>Nenhuma ferramenta encontrada para os filtros selecionados.</EmptyState>
        )}

        {!isLoading && !isError && filtradas.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="gd-table">
              <caption className="gd-visually-hidden">
                Lista de ferramentas e agentes registrados
              </caption>
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Nome</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Unidade responsável</th>
                  <th scope="col">Risco</th>
                  <th scope="col">Revisão humana</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((tool) => (
                  <tr key={tool.id}>
                    <td className="gd-mono">{tool.codigo_institucional}</td>
                    <td>{tool.nome}</td>
                    <td>
                      <Badge tone={tool.tipo === 'agente' ? 'info' : 'neutral'}>{tool.tipo}</Badge>
                    </td>
                    <td>{tool.unidade_responsavel}</td>
                    <td>
                      <RiskBadge risco={tool.categoria_risco} />
                    </td>
                    <td>{tool.revisao_humana_obrigatoria ? 'Obrigatória' : 'Opcional'}</td>
                    <td>{tool.status ?? '—'}</td>
                    <td>
                      <Link className="gd-btn gd-btn--secondary gd-btn--sm" to={`/ferramentas/${tool.id}`}>
                        Abrir ficha
                      </Link>
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
