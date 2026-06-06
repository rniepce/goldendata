/*
 * /ferramentas/:id/versoes — linha do tempo combinada de versões de ferramenta
 * e de prompt, com changelog.
 */

import { useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useToolFicha } from '../../lib/queries';
import { Badge, Card, ErrorAlert, Loading, PageHeader } from '../../components/ui';
import type { PromptVersion, ToolVersion } from '../../lib/types';

interface TimelineItem {
  id: string;
  tipo: 'ferramenta' | 'prompt';
  versao: string;
  changelog?: string;
  data?: string;
  detalhe?: string;
}

export function ToolVersionsPage(): ReactNode {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useToolFicha(id);

  const itens = useMemo<TimelineItem[]>(() => {
    if (!data) return [];
    const fromTool = data.tool_versions.map(
      (v: ToolVersion): TimelineItem => ({
        id: v.id,
        tipo: 'ferramenta',
        versao: v.versao,
        changelog: v.changelog,
        data: v.criado_em,
        detalhe: `Modelo-base ${v.model_base_id}${v.git_commit ? ` · commit ${v.git_commit}` : ''}`,
      }),
    );
    const fromPrompt = data.prompt_versions.map(
      (p: PromptVersion): TimelineItem => ({
        id: p.id,
        tipo: 'prompt',
        versao: p.versao,
        changelog: p.changelog,
        data: p.criado_em,
        detalhe: p.parent_version ? `Derivada de ${p.parent_version}` : undefined,
      }),
    );
    return [...fromTool, ...fromPrompt].sort((a, b) => {
      if (a.data && b.data) return b.data.localeCompare(a.data);
      return 0;
    });
  }, [data]);

  if (isLoading) return <Loading label="Carregando versões…" />;
  if (isError) return <ErrorAlert error={error} />;
  if (!data) return null;

  return (
    <>
      <PageHeader
        title={`Versões — ${data.ferramenta.nome}`}
        description="Linha do tempo de versões da ferramenta e de prompts, com changelog."
        actions={
          <Link className="gd-btn gd-btn--secondary gd-btn--sm" to={`/ferramentas/${data.ferramenta.id}`}>
            Voltar à ficha
          </Link>
        }
      />

      <Card>
        {itens.length === 0 ? (
          <p>Nenhuma versão registrada ainda.</p>
        ) : (
          <ol className="gd-timeline">
            {itens.map((item) => (
              <li key={`${item.tipo}-${item.id}`}>
                <div className="gd-row">
                  <Badge tone={item.tipo === 'ferramenta' ? 'info' : 'neutral'}>
                    {item.tipo === 'ferramenta' ? 'Ferramenta' : 'Prompt'}
                  </Badge>
                  <strong className="gd-mono">{item.versao}</strong>
                  {item.data && (
                    <span className="gd-mono" style={{ color: 'var(--gd-color-text-muted)' }}>
                      {new Date(item.data).toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
                {item.detalhe && (
                  <div style={{ color: 'var(--gd-color-text-muted)', fontSize: 'var(--gd-font-size-sm)' }}>
                    {item.detalhe}
                  </div>
                )}
                {item.changelog && <p style={{ marginTop: '0.25rem' }}>{item.changelog}</p>}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}
