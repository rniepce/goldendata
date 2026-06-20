/*
 * /ferramentas/:id — Ficha Técnica consolidada por seções, com edição.
 * Seções: Identificação, Risco/Vedações, Propósito/Limites, Modelo-base+versões,
 * Prompts, Dados/LGPD, Riscos, Anexos, Histórico.
 */

import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth, hasAnyRole } from '../../lib/auth-oidc';
import { useToolFicha } from '../../lib/queries';
import { api } from '../../lib/api';
import {
  Badge,
  Card,
  ErrorAlert,
  Loading,
  Markdown,
  MetaItem,
  PageHeader,
  RiskBadge,
} from '../../components/ui';
import { BASE_LEGAL_OPTIONS, NATUREZA_DADO_OPTIONS } from '../../lib/options';
import { PromptVersionForm } from './PromptVersionForm';
import { ToolVersionForm } from './ToolVersionForm';
import { DataInventoryForm } from './DataInventoryForm';
import { ConformidadeCard } from './ConformidadeCard';
import { CoerenciaCard } from './CoerenciaCard';
import { SaudeCard } from './SaudeCard';
import { DossieEditForm } from './DossieEditForm';

type SectionId =
  | 'identificacao'
  | 'risco'
  | 'proposito'
  | 'governanca'
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
  { id: 'governanca', label: 'Dossiê GEX-IA' },
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
  const [editandoDossie, setEditandoDossie] = useState(false);

  const podeEditar = hasAnyRole(user, 'owner_ferramenta', 'coordenador_comite', 'admin');
  const resumoIa = useMutation({ mutationFn: () => api.resumirFerramenta(id ?? '') });

  if (isLoading) return <Loading label="Carregando ficha técnica…" />;
  if (isError) return <ErrorAlert error={error} />;
  if (!data) return null;

  const { ferramenta, agent_spec, data_inventory, prompt_versions, tool_versions, risks, attachments } =
    data;

  return (
    <>
      <PageHeader
        title={ferramenta.nome}
        description={
          <>
            Código institucional <span className="gd-code">{ferramenta.codigo_institucional}</span> ·{' '}
            {ferramenta.unidade_responsavel}
          </>
        }
        actions={
          <>
            <RiskBadge risco={ferramenta.categoria_risco} />
            <Link className="gd-btn gd-btn--secondary gd-btn--sm" to={`/ferramentas/${ferramenta.id}/versoes`}>
              Ver linha do tempo
            </Link>
          </>
        }
      />

      <Card title="Parecer executivo (IA)">
        {!resumoIa.data && !resumoIa.isPending && (
          <button
            type="button"
            className="gd-btn gd-btn--secondary gd-btn--sm"
            aria-label="Gerar parecer executivo com IA"
            onClick={() => resumoIa.mutate()}
          >
            ✨ Gerar parecer executivo (IA)
          </button>
        )}
        {resumoIa.isPending && <Loading label="Gerando parecer… (pode levar até 30s)" />}
        {resumoIa.isError && (
          <div style={{ marginTop: 'var(--gd-space-2)' }}>
            <ErrorAlert error={resumoIa.error} />
            <p style={{ fontSize: 'var(--gd-font-size-sm)', color: 'var(--gd-color-text-muted)' }}>
              Se a IA não estiver configurada, defina GOLDENDATA_AI_API_KEY no backend.
            </p>
          </div>
        )}
        {resumoIa.data && !resumoIa.isPending && (
          <>
            <Markdown text={resumoIa.data.resumo} />
            <button
              type="button"
              className="gd-btn gd-btn--secondary gd-btn--sm"
              onClick={() => resumoIa.mutate()}
            >
              Regenerar
            </button>
            <p style={{ fontSize: 'var(--gd-font-size-xs)', color: 'var(--gd-color-text-muted)', marginBottom: 0, marginTop: 'var(--gd-space-2)' }}>
              Texto gerado por IA como apoio — a decisão e a validação permanecem humanas.
            </p>
          </>
        )}
      </Card>

      <SaudeCard toolId={ferramenta.id} />

      <ConformidadeCard toolId={ferramenta.id} />

      <CoerenciaCard toolId={ferramenta.id} />

      <div className="gd-tabs" role="tablist" aria-label="Seções da ficha técnica" style={{ marginTop: 'var(--gd-space-4)' }}>
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
              <MetaItem label="Código institucional"><span className="gd-code">{ferramenta.codigo_institucional}</span></MetaItem>
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
              <MetaItem label="Categoria CNJ 615">
                <span className="gd-code">{ferramenta.categoria_risco_cnj ?? '—'}</span>
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

        {active === 'governanca' && (
          <Card
            title="Dossiê de Governança — GEX-IA / CIAR (CNJ 615/2025)"
            actions={
              podeEditar && (
                <button
                  type="button"
                  className="gd-btn gd-btn--secondary gd-btn--sm"
                  onClick={() => setEditandoDossie((v) => !v)}
                >
                  {editandoDossie ? 'Cancelar' : 'Editar dossiê'}
                </button>
              )
            }
          >
            {editandoDossie ? (
              <DossieEditForm tool={ferramenta} onDone={() => setEditandoDossie(false)} />
            ) : (
              <>
            <div className="gd-meta-grid" style={{ marginBottom: '1rem' }}>
              <MetaItem label="Nº Dossiê"><span className="gd-code">{ferramenta.codigo_institucional}</span></MetaItem>
              <MetaItem label="Categoria de risco CNJ 615">
                <span className="gd-code">{ferramenta.categoria_risco_cnj ?? '—'}</span>
              </MetaItem>
              <MetaItem label="Estágio">{ferramenta.estagio_gexia ?? '—'}</MetaItem>
              <MetaItem label="Status da governança">{ferramenta.status_governanca ?? '—'}</MetaItem>
              <MetaItem label="Fase de análise">{ferramenta.fase_gexia ?? '—'}</MetaItem>
              <MetaItem label="Desenvolvimento">{ferramenta.desenvolvimento ?? '—'}</MetaItem>
              <MetaItem label="Instituição parceira">{ferramenta.instituicao_parceira ?? '—'}</MetaItem>
              <MetaItem label="Analista responsável">{ferramenta.analista_responsavel ?? '—'}</MetaItem>
              <MetaItem label="Processo SEI">{ferramenta.processo_sei ?? '—'}</MetaItem>
              <MetaItem label="Data da análise">{ferramenta.data_analise ?? '—'}</MetaItem>
            </div>
            {ferramenta.riscos_identificados && ferramenta.riscos_identificados.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h3>Riscos identificados</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {ferramenta.riscos_identificados.map((r) => (
                    <Badge key={r} tone="warning">{r}</Badge>
                  ))}
                </div>
              </div>
            )}
            <MetaItem label="Interfaces institucionais acionadas">
              {ferramenta.interfaces_institucionais ?? '—'}
            </MetaItem>
            <div style={{ marginTop: '1rem' }}>
              <MetaItem label="Documento de origem">{ferramenta.documento_origem ?? '—'}</MetaItem>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <MetaItem label="Observações">{ferramenta.observacoes ?? '—'}</MetaItem>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <MetaItem label="Próximos passos">{ferramenta.proximos_passos ?? '—'}</MetaItem>
            </div>
            {ferramenta.origem_registro && (
              <p style={{ marginTop: '1rem', fontSize: '0.85rem', opacity: 0.7 }}>
                Proveniência do registro: {ferramenta.origem_registro}
              </p>
            )}
              </>
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
