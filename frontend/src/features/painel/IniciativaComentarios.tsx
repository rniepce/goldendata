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

/** Aceita apenas anexos http(s); bloqueia javascript:/data:/vbscript: (XSS via href). */
function urlHttpSegura(u?: string | null): string | null {
  if (!u) return null;
  try {
    const p = new URL(u);
    return p.protocol === 'http:' || p.protocol === 'https:' ? u : null;
  } catch {
    return null;
  }
}

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
    <div className="painel-coment">
      <h3 className="painel-coment__h">Discussão</h3>

      {isLoading && <Loading label="Carregando comentários…" />}
      {isError && <ErrorAlert error={error} />}

      {data && data.length === 0 && (
        <p className="painel-coment__vazio">Nenhum comentário ainda. Inicie a discussão abaixo.</p>
      )}

      {data?.map((c) => (
        <div key={c.id} className={`painel-coment__item${c.resolvido ? ' painel-coment__item--resolvido' : ''}`}>
          <span className="painel-avatar">{iniciais(c.autor_nome)}</span>
          <div className="painel-coment__body">
            <div className="painel-coment__meta">
              <strong>{c.autor_nome ?? 'Usuário'}</strong>{' '}
              · {new Date(c.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              {c.resolvido && (
                <>
                  {' '}
                  <Badge tone="success">resolvido</Badge>
                </>
              )}
            </div>
            <div className="painel-coment__texto">{c.texto}</div>
            {c.anexo_url &&
              (urlHttpSegura(c.anexo_url) ? (
                <a
                  className="painel-coment__anexo"
                  href={urlHttpSegura(c.anexo_url) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📎 {c.anexo_titulo || c.anexo_url}
                </a>
              ) : (
                <span className="painel-coment__anexo" title="Anexo com URL não-http ignorado">
                  📎 {c.anexo_titulo || c.anexo_url}
                </span>
              ))}
            <div className="painel-coment__acoes">
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

      <form className="painel-coment__form" onSubmit={onSubmit}>
        {add.isError && <ErrorAlert error={add.error} />}
        <textarea
          className="gd-textarea"
          rows={2}
          placeholder="Escreva um comentário…"
          aria-label="Conteúdo do comentário"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        {anexoOpen && (
          <div className="gd-form-grid painel-coment__anexos">
            <input className="gd-input" aria-label="URL do anexo (link do SEI ou documento)" placeholder="Link (URL do SEI/documento)" value={anexoUrl} onChange={(e) => setAnexoUrl(e.target.value)} />
            <input className="gd-input" aria-label="Título do anexo" placeholder="Título do anexo" value={anexoTitulo} onChange={(e) => setAnexoTitulo(e.target.value)} />
          </div>
        )}
        <div className="painel-coment__envio">
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
