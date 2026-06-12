/*
 * /ferramentas/:id — Ficha Técnica consolidada por seções, com edição.
 * Seções: Identificação, Risco/Vedações, Propósito/Limites, Modelo-base+versões,
 * Prompts, Dados/LGPD, Riscos, Anexos, Histórico.
 */

import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth, hasAnyRole } from '../../lib/auth-oidc';
import { useToolFicha } from '../../lib/queries';
import {
  Badge,
  Card,
  ErrorAlert,
  Loading,
  MetaItem,
  PageHeader,
  RiskBadge,
} from '../../components/ui';
import { BASE_LEGAL_OPTIONS, NATUREZA_DADO_OPTIONS } from '../../lib/options';
import { PromptVersionForm } from './PromptVersionForm';
import { ToolVersionForm } from './ToolVersionForm';
import { DataInventoryForm } from './DataInventoryForm';

type SectionId =
  | 'identificacao'
  | 'risco'
  | 'proposito'
  | 'modelos'
  | 'prompts'
  | 'dados'
  | 'riscos'
  | 'anexos'
  | 'historico';

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'identificacao', label: 'Identificação' },
  { id: 'risco', label: 'Risco e vedações' },
  { id: 'proposito', label: 'Propósito e limites' },
  { id: 'modelos', label: 'Modelo-base e versões' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'dados', label: 'Dados e LGPD' },
  { id: 'riscos', label: 'Riscos' },
  { id: 'anexos', label: 'Anexos' },
  { id: 'historico', label: 'Histórico' },
];

function labelFromOptions(options: { value: string; label: string }[], value?: string): string {
  return options.find((o) => o.value === value)?.label ?? value ?? '—';
}

export function ToolDetailPage(): ReactNode {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useToolFicha(id);
  const [active, setActive] = useState<SectionId>('identificacao');

  const podeEditar = hasAnyRole(user, 'owner_ferramenta', 'coordenador_comite', 'admin');

  if (isLoading) return <Loading label="Carregando ficha técnica…" />;
  if (isError) return <ErrorAlert error={error} />;
  if (!data) return null;

  const { ferramenta, agent_spec, data_inventory, prompt_versions, tool_versions, risks, attachments } =
    data;

  return (
    <>
      <PageHeader
        title={ferramenta.nome}
        description={`Código institucional ${ferramenta.codigo_institucional} · ${ferramenta.unidade_responsavel}`}
        actions={
          <>
            <RiskBadge risco={ferramenta.categoria_risco} />
            <Link className="gd-btn gd-btn--secondary gd-btn--sm" to={`/ferramentas/${ferramenta.id}/versoes`}>
              Ver linha do tempo
            </Link>
          </>
        }
      />

      <div className="gd-tabs" role="tablist" aria-label="Seções da ficha técnica">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            id={`tab-${section.id}`}
            aria-selected={active === section.id}
            aria-controls={`panel-${section.id}`}
            className="gd-tab"
            onClick={() => setActive(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>
        {active === 'identificacao' && (
          <Card title="Identificação">
            <div className="gd-meta-grid">
              <MetaItem label="Código institucional">{ferramenta.codigo_institucional}</MetaItem>
              <MetaItem label="Tipo">
                <Badge tone={ferramenta.tipo === 'agente' ? 'info' : 'neutral'}>{ferramenta.tipo}</Badge>
              </MetaItem>
              <MetaItem label="Unidade responsável">{ferramenta.unidade_responsavel}</MetaItem>
              <MetaItem label="ID Sinapses">{ferramenta.sinapses_id ?? '—'}</MetaItem>
              <MetaItem label="Próxima revisão">{ferramenta.proxima_revisao_em ?? '—'}</MetaItem>
              <MetaItem label="Status">{ferramenta.status_ciclo_vida ?? '—'}</MetaItem>
            </div>
          </Card>
        )}

        {active === 'risco' && (
          <Card title="Classificação de risco e vedações">
            <div className="gd-meta-grid" style={{ marginBottom: '1rem' }}>
              <MetaItem label="Categoria de risco">
                <RiskBadge risco={ferramenta.categoria_risco} />
              </MetaItem>
              <MetaItem label="Revisão humana">
                {ferramenta.revisao_humana_obrigatoria ? 'Obrigatória' : 'Opcional'}
              </MetaItem>
              <MetaItem label="Grau de supervisão humana">
                {ferramenta.grau_supervisao_humana}
              </MetaItem>
            </div>
            <MetaItem label="Justificativa do risco">
              {ferramenta.justificativa_risco ?? '—'}
            </MetaItem>
            <h3 style={{ marginTop: '1.5rem' }}>Checklist de vedações</h3>
            {ferramenta.vedacoes_checklist &&
            Object.keys(ferramenta.vedacoes_checklist).length > 0 ? (
              <ul>
                {Object.entries(ferramenta.vedacoes_checklist).map(([chave, valor]) => (
                  <li key={chave}>
                    {chave}: <Badge tone={valor ? 'success' : 'neutral'}>{valor ? 'sim' : 'não'}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma vedação registrada.</p>
            )}
          </Card>
        )}

        {active === 'proposito' && (
          <Card title="Propósito e limites">
            <MetaItem label="Descrição">{ferramenta.descricao ?? '—'}</MetaItem>
            <div style={{ marginTop: '1rem' }}>
              <MetaItem label="Explicação em linguagem simples">
                {ferramenta.explicacao_linguagem_simples ?? '—'}
              </MetaItem>
            </div>
            {agent_spec && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3>Especificação do agente</h3>
                <div className="gd-meta-grid">
                  <MetaItem label="Objetivo">{agent_spec.objetivo ?? '—'}</MetaItem>
                  <MetaItem label="Limites">{agent_spec.limites ?? '—'}</MetaItem>
                  <MetaItem label="Ferramentas disponíveis">
                    {agent_spec.ferramentas_disponiveis?.join(', ') ?? '—'}
                  </MetaItem>
                </div>
              </div>
            )}
          </Card>
        )}

        {active === 'modelos' && (
          <Card title="Modelo-base e versões da ferramenta">
            {tool_versions.length === 0 ? (
              <p>Nenhuma versão registrada.</p>
            ) : (
              <table className="gd-table">
                <thead>
                  <tr>
                    <th scope="col">Versão</th>
                    <th scope="col">Modelo-base</th>
                    <th scope="col">Prompt</th>
                    <th scope="col">Commit</th>
                    <th scope="col">Changelog</th>
                  </tr>
                </thead>
                <tbody>
                  {tool_versions.map((v) => (
                    <tr key={v.id}>
                      <td className="gd-mono">{v.versao}</td>
                      <td className="gd-mono">{v.model_base_id}</td>
                      <td className="gd-mono">{v.prompt_version_id ?? '—'}</td>
                      <td className="gd-mono">{v.git_commit ?? '—'}</td>
                      <td>{v.changelog ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {podeEditar && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3>Nova versão da ferramenta</h3>
                <ToolVersionForm toolId={ferramenta.id} promptVersions={prompt_versions} />
              </div>
            )}
          </Card>
        )}

        {active === 'prompts' && (
          <Card title="Versões de prompt">
            {prompt_versions.length === 0 ? (
              <p>Nenhuma versão de prompt registrada.</p>
            ) : (
              <table className="gd-table">
                <thead>
                  <tr>
                    <th scope="col">Versão</th>
                    <th scope="col">Parent</th>
                    <th scope="col">Changelog</th>
                  </tr>
                </thead>
                <tbody>
                  {prompt_versions.map((p) => (
                    <tr key={p.id}>
                      <td className="gd-mono">{p.versao}</td>
                      <td className="gd-mono">{p.parent_version ?? '—'}</td>
                      <td>{p.changelog ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {podeEditar && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3>Nova versão de prompt</h3>
                <PromptVersionForm toolId={ferramenta.id} />
              </div>
            )}
          </Card>
        )}

        {active === 'dados' && (
          <Card title="Inventário de dados e LGPD">
            {data_inventory.length === 0 ? (
              <p>Nenhum item de inventário de dados registrado.</p>
            ) : (
              <table className="gd-table">
                <thead>
                  <tr>
                    <th scope="col">Natureza</th>
                    <th scope="col">Origem</th>
                    <th scope="col">Base legal</th>
                    <th scope="col">Pessoais</th>
                    <th scope="col">Sensíveis</th>
                    <th scope="col">Sigilo</th>
                    <th scope="col">RIPD</th>
                  </tr>
                </thead>
                <tbody>
                  {data_inventory.map((d) => (
                    <tr key={d.id}>
                      <td>{labelFromOptions(NATUREZA_DADO_OPTIONS, d.natureza)}</td>
                      <td>{d.origem}</td>
                      <td>{labelFromOptions(BASE_LEGAL_OPTIONS, d.base_legal)}</td>
                      <td>{d.contem_dados_pessoais ? 'Sim' : 'Não'}</td>
                      <td>{d.contem_dados_sensiveis ? 'Sim' : 'Não'}</td>
                      <td>{d.contem_sigilo ? 'Sim' : 'Não'}</td>
                      <td>
                        {d.ripd_requerido ? (
                          <Badge tone="warning">requerido</Badge>
                        ) : (
                          <Badge tone="neutral">não</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {podeEditar && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3>Novo item de inventário de dados</h3>
                <DataInventoryForm toolId={ferramenta.id} />
              </div>
            )}
          </Card>
        )}

        {active === 'riscos' && (
          <Card title="Riscos identificados">
            {risks.length === 0 ? (
              <p>Nenhum risco registrado.</p>
            ) : (
              <table className="gd-table">
                <thead>
                  <tr>
                    <th scope="col">Descrição</th>
                    <th scope="col">Severidade</th>
                    <th scope="col">Mitigação</th>
                  </tr>
                </thead>
                <tbody>
                  {risks.map((r) => (
                    <tr key={r.id}>
                      <td>{r.descricao}</td>
                      <td>{r.severidade ?? '—'}</td>
                      <td>{r.mitigacao ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}

        {active === 'anexos' && (
          <Card title="Anexos">
            {attachments.length === 0 ? (
              <p>Nenhum anexo registrado.</p>
            ) : (
              <ul>
                {attachments.map((a) => (
                  <li key={a.id}>
                    {a.url ? (
                      <a href={a.url} target="_blank" rel="noopener noreferrer">
                        {a.nome}
                      </a>
                    ) : (
                      a.nome
                    )}
                    {a.tipo && <span className="gd-mono"> · {a.tipo}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {active === 'historico' && (
          <Card title="Histórico">
            <p>
              A trilha completa de alterações desta ferramenta está disponível na{' '}
              <Link to={`/auditoria?entidade=tool&entidade_id=${ferramenta.id}`}>
                área de auditoria
              </Link>
              . Para a linha do tempo de versões e prompts, acesse a{' '}
              <Link to={`/ferramentas/${ferramenta.id}/versoes`}>página de versões</Link>.
            </p>
            <div className="gd-meta-grid">
              <MetaItem label="Total de versões da ferramenta">{tool_versions.length}</MetaItem>
              <MetaItem label="Total de versões de prompt">{prompt_versions.length}</MetaItem>
              <MetaItem label="Itens de inventário de dados">{data_inventory.length}</MetaItem>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
