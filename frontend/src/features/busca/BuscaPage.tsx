/*
 * Busca global (catálogo + iniciativas + golden datasets) e Q&A por IA sobre o
 * acervo. A busca é instantânea; o Q&A usa a IA assistiva (se configurada).
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Badge, Card, ErrorAlert, Loading, Markdown, PageHeader } from '../../components/ui';

export function BuscaPage(): ReactNode {
  const [q, setQ] = useState('');
  const [pergunta, setPergunta] = useState('');

  const busca = useQuery({
    queryKey: ['busca', q],
    queryFn: () => api.busca(q),
    enabled: q.trim().length >= 2,
  });

  const qa = useMutation({ mutationFn: (p: string) => api.perguntarIA(p) });

  function onPerguntar(e: FormEvent): void {
    e.preventDefault();
    if (pergunta.trim().length >= 3) qa.mutate(pergunta.trim());
  }

  const hits = busca.data?.resultados ?? [];

  return (
    <>
      <PageHeader title="Busca" description="Encontre ferramentas, iniciativas e conjuntos de avaliação — ou pergunte ao assistente." />

      <Card title="Buscar no acervo">
        <input
          className="gd-input"
          style={{ width: '100%', fontSize: '1rem' }}
          placeholder="Digite ao menos 2 caracteres (nome, código, unidade, responsável…)"
          aria-label="Buscar no acervo"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        {q.trim().length >= 2 && (
          <div style={{ marginTop: '1rem' }}>
            {busca.isLoading && <p>Buscando…</p>}
            {busca.isError && <ErrorAlert error={busca.error} />}
            {busca.data && hits.length === 0 && <p>Nada encontrado para “{q}”.</p>}
            {hits.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {hits.map((h) => (
                  <li key={`${h.tipo}-${h.id}`} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--gd-color-border)' }}>
                    <Link to={h.link} style={{ fontWeight: 600 }}>{h.titulo}</Link>{' '}
                    <Badge tone="neutral">{h.tipo}</Badge>
                    {h.subtitulo && (
                      <div style={{ fontSize: 'var(--gd-font-size-sm)', color: 'var(--gd-color-text-muted)' }}>
                        {h.subtitulo}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <div style={{ marginTop: 'var(--gd-space-4)' }}>
        <Card title="Perguntar ao assistente (IA)">
          <p style={{ marginTop: 0, color: 'var(--gd-color-text-muted)', fontSize: 'var(--gd-font-size-sm)' }}>
            Pergunte em linguagem natural sobre o catálogo e as iniciativas. Ex.: “quais soluções estão em uso e de alto risco?”,
            “quem é responsável pela política de uso de IA generativa?”.
          </p>
          <form onSubmit={onPerguntar}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="gd-input"
                style={{ flex: 1 }}
                placeholder="Sua pergunta…"
                aria-label="Pergunta para o assistente de IA"
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
              />
              <button type="submit" className="gd-btn" disabled={qa.isPending || pergunta.trim().length < 3}>
                {qa.isPending ? 'Pensando…' : 'Perguntar'}
              </button>
            </div>
          </form>
          {qa.isPending && <Loading label="Consultando o assistente… (pode levar até 30s)" />}
          {qa.isError && (
            <div style={{ marginTop: '0.8rem' }}>
              <ErrorAlert error={qa.error} />
              <p style={{ fontSize: 'var(--gd-font-size-sm)', color: 'var(--gd-color-text-muted)' }}>
                Se a mensagem indicar que a IA não está configurada, defina a chave no backend (GOLDENDATA_AI_API_KEY).
              </p>
            </div>
          )}
          {qa.data && (
            <div className="gd-md--panel" style={{ marginTop: 'var(--gd-space-4)' }}>
              <Markdown text={qa.data.resposta} />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
