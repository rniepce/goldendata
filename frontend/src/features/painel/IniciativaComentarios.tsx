import { useState, type FormEvent, type ReactNode } from 'react';
import { Badge, ErrorAlert, Loading } from '../../components/ui';
import { useAuth, hasAnyRole } from '../../lib/auth-oidc';
import {
  useAddComentario,
  useComentarios,
  useDeleteComentario,
  useResolverComentario,
} from '../../lib/queries';
import { iniciais } from './IniciativaCard';

export function IniciativaComentarios({ iniciativaId }: { iniciativaId: string }): ReactNode {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useComentarios(iniciativaId);
  const add = useAddComentario(iniciativaId);
  const resolver = useResolverComentario(iniciativaId);
  const remove = useDeleteComentario(iniciativaId);

  const [texto, setTexto] = useState('');
  const [anexoUrl, setAnexoUrl] = useState('');
  const [anexoTitulo, setAnexoTitulo] = useState('');
  const [anexoOpen, setAnexoOpen] = useState(false);

  function onSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!texto.trim()) return;
    add.mutate(
      {
        texto: texto.trim(),
        anexo_url: anexoUrl.trim() || null,
        anexo_titulo: anexoTitulo.trim() || null,
      },
      {
        onSuccess: () => {
          setTexto('');
          setAnexoUrl('');
          setAnexoTitulo('');
          setAnexoOpen(false);
        },
      },
    );
  }

  const podeModerar = hasAnyRole(user, 'coordenador_comite', 'admin');

  return (
    <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--gd-color-border)', paddingTop: '1rem' }}>
      <h3 style={{ fontSize: '0.95rem', marginTop: 0 }}>Discussão</h3>

      {isLoading && <Loading label="Carregando comentários…" />}
      {isError && <ErrorAlert error={error} />}

      {data && data.length === 0 && (
        <p style={{ color: 'var(--gd-color-text-muted)', fontSize: 'var(--gd-font-size-sm)' }}>
          Nenhum comentário ainda. Inicie a discussão abaixo.
        </p>
      )}

      {data?.map((c) => (
        <div
          key={c.id}
          style={{
            display: 'flex',
            gap: '0.6rem',
            padding: '0.6rem 0',
            borderBottom: '1px solid var(--gd-color-border)',
            opacity: c.resolvido ? 0.6 : 1,
          }}
        >
          <span className="painel-avatar" style={{ flex: '0 0 auto' }}>{iniciais(c.autor_nome)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--gd-color-text-muted)' }}>
              <strong style={{ color: 'var(--gd-color-text)' }}>{c.autor_nome ?? 'Usuário'}</strong>{' '}
              · {new Date(c.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              {c.resolvido && (
                <>
                  {' '}
                  <Badge tone="success">resolvido</Badge>
                </>
              )}
            </div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', marginTop: '0.15rem' }}>{c.texto}</div>
            {c.anexo_url && (
              <a href={c.anexo_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem' }}>
                📎 {c.anexo_titulo || c.anexo_url}
              </a>
            )}
            <div style={{ display: 'flex', gap: 'var(--gd-space-2)', marginTop: 'var(--gd-space-1)' }}>
              <button
                type="button"
                className="gd-btn gd-btn--text"
                onClick={() => resolver.mutate({ id: c.id, resolvido: !c.resolvido })}
              >
                {c.resolvido ? 'Reabrir' : 'Resolver'}
              </button>
              {(c.autor_sub === user?.sub || podeModerar) && (
                <button
                  type="button"
                  className="gd-btn gd-btn--text gd-btn--muted"
                  onClick={() => remove.mutate(c.id)}
                >
                  Excluir
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      <form onSubmit={onSubmit} style={{ marginTop: '0.8rem' }}>
        {add.isError && <ErrorAlert error={add.error} />}
        <textarea
          className="gd-textarea"
          rows={2}
          placeholder="Escreva um comentário…"
          aria-label="Conteúdo do comentário"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          style={{ width: '100%' }}
        />
        {anexoOpen && (
          <div className="gd-form-grid" style={{ marginTop: '0.4rem' }}>
            <input className="gd-input" aria-label="URL do anexo (link do SEI ou documento)" placeholder="Link (URL do SEI/documento)" value={anexoUrl} onChange={(e) => setAnexoUrl(e.target.value)} />
            <input className="gd-input" aria-label="Título do anexo" placeholder="Título do anexo" value={anexoTitulo} onChange={(e) => setAnexoTitulo(e.target.value)} />
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', alignItems: 'center' }}>
          <button type="submit" className="gd-btn gd-btn--sm" disabled={add.isPending || !texto.trim()}>
            {add.isPending ? 'Enviando…' : 'Comentar'}
          </button>
          <button
            type="button"
            className="gd-btn gd-btn--secondary gd-btn--sm"
            onClick={() => setAnexoOpen((v) => !v)}
          >
            📎 {anexoOpen ? 'Sem anexo' : 'Anexar link'}
          </button>
        </div>
      </form>
    </div>
  );
}
