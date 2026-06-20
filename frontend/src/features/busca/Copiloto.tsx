/*
 * Copiloto-chat (#74): conversa multi-turno aterrada por RAG sobre a base de
 * conhecimento + acervo. Cada resposta da IA traz as fontes citadas. Stateless
 * no servidor — o histórico recente é enviado a cada turno (com teto no backend).
 */

import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Badge, ErrorAlert, Loading, Markdown } from '../../components/ui';
import type { ChatResposta, ChatTurno, FonteRag } from '../../lib/types';

interface Msg {
  papel: 'user' | 'assistant';
  texto: string;
  fontes?: FonteRag[];
}

const bolha = (papel: 'user' | 'assistant'): CSSProperties => ({
  alignSelf: papel === 'user' ? 'flex-end' : 'flex-start',
  maxWidth: '90%',
  padding: '0.6rem 0.85rem',
  borderRadius: 'var(--gd-radius, 6px)',
  background: papel === 'user' ? 'var(--gd-color-primary)' : 'var(--gd-color-bg-subtle, #efe9dc)',
  color: papel === 'user' ? '#fff' : 'var(--gd-color-text)',
  border: papel === 'user' ? 'none' : '1px solid var(--gd-color-border)',
});

export function Copiloto(): ReactNode {
  const [mensagens, setMensagens] = useState<Msg[]>([]);
  const [pergunta, setPergunta] = useState('');
  const chat = useMutation({
    mutationFn: ({ p, hist }: { p: string; hist: ChatTurno[] }) => api.chatIA(p, hist),
  });

  function enviar(e: FormEvent): void {
    e.preventDefault();
    const p = pergunta.trim();
    if (p.length < 2 || chat.isPending) return;
    const hist: ChatTurno[] = mensagens.map((m) => ({ papel: m.papel, texto: m.texto }));
    setMensagens((cur) => [...cur, { papel: 'user', texto: p }]);
    setPergunta('');
    chat.mutate(
      { p, hist },
      {
        onSuccess: (r: ChatResposta) =>
          setMensagens((cur) => [
            ...cur,
            { papel: 'assistant', texto: r.resposta, fontes: r.fontes },
          ]),
      },
    );
  }

  return (
    <div>
      {mensagens.length === 0 && !chat.isPending && (
        <p
          style={{
            marginTop: 0,
            color: 'var(--gd-color-text-muted)',
            fontSize: 'var(--gd-font-size-sm)',
          }}
        >
          Converse sobre o acervo e as diretrizes da base de conhecimento. Ex.: “o que diz a nossa
          diretriz para minutas de despacho?”, “quais soluções de alto risco estão em produção?”. O
          copiloto cita as fontes que usar.
        </p>
      )}

      {mensagens.length > 0 && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}
        >
          {mensagens.map((m, i) => (
            <div key={i} style={bolha(m.papel)}>
              {m.papel === 'assistant' ? (
                <Markdown text={m.texto} />
              ) : (
                <p style={{ margin: 0 }}>{m.texto}</p>
              )}
              {m.fontes && m.fontes.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.35rem',
                    marginTop: '0.5rem',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 'var(--gd-font-size-sm)', opacity: 0.8 }}>Fontes:</span>
                  {m.fontes.map((f, n) => (
                    <Badge key={f.documento_id} tone="info">
                      [{n + 1}] {f.titulo}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {chat.isPending && <Loading label="Consultando o copiloto… (pode levar até 30s)" />}
      {chat.isError && (
        <div style={{ marginTop: '0.8rem' }}>
          <ErrorAlert error={chat.error} />
          <p style={{ fontSize: 'var(--gd-font-size-sm)', color: 'var(--gd-color-text-muted)' }}>
            Se a mensagem indicar que a IA não está configurada, defina a chave no backend
            (GOLDENDATA_AI_API_KEY).
          </p>
        </div>
      )}

      <form onSubmit={enviar} style={{ marginTop: 'var(--gd-space-4)' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            className="gd-input"
            style={{ flex: 1 }}
            placeholder="Pergunte ao copiloto…"
            aria-label="Mensagem para o copiloto"
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
          />
          <button
            type="submit"
            className="gd-btn"
            disabled={chat.isPending || pergunta.trim().length < 2}
          >
            {chat.isPending ? 'Pensando…' : 'Enviar'}
          </button>
        </div>
      </form>
    </div>
  );
}
