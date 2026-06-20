/*
 * /copiloto — Copiloto operável por linguagem natural (#63).
 * Conversa que responde (RAG) OU propõe uma ação de escrita. A escrita NUNCA
 * executa sozinha: vira um cartão de confirmação; ao confirmar, roda com o
 * usuário logado (RBAC) e entra na auditoria como a pessoa real.
 */

import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ApiError, api } from '../../lib/api';
import {
  Badge,
  Card,
  ErrorAlert,
  InfoAlert,
  Loading,
  Markdown,
  PageHeader,
} from '../../components/ui';
import type { ChatTurno, CopilotoAcao, CopilotoResposta } from '../../lib/types';

type Estado = 'pendente' | 'executada' | 'cancelada' | 'erro';

interface Msg {
  papel: 'user' | 'assistant';
  texto?: string;
  acao?: CopilotoAcao;
  estado?: Estado;
  detalhe?: string;
}

const bolha = (papel: 'user' | 'assistant'): CSSProperties => ({
  alignSelf: papel === 'user' ? 'flex-end' : 'flex-start',
  maxWidth: papel === 'user' ? '85%' : '95%',
  padding: '0.6rem 0.85rem',
  borderRadius: 'var(--gd-radius, 6px)',
  background: papel === 'user' ? 'var(--gd-color-primary)' : 'var(--gd-color-bg-subtle, #efe9dc)',
  color: papel === 'user' ? '#fff' : 'var(--gd-color-text)',
  border: papel === 'user' ? 'none' : '1px solid var(--gd-color-border)',
});

function ActionCard({
  acao,
  estado,
  detalhe,
  pending,
  onConfirm,
  onCancel,
}: {
  acao: CopilotoAcao;
  estado?: Estado;
  detalhe?: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}): ReactNode {
  return (
    <div>
      <div className="gd-row" style={{ alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <Badge tone="warning">ação proposta</Badge>
        <strong>{acao.resumo}</strong>
      </div>
      <pre
        style={{
          margin: '0 0 0.5rem',
          fontSize: '0.78rem',
          whiteSpace: 'pre-wrap',
          background: 'var(--gd-color-surface, #fff)',
          padding: '0.5rem',
          borderRadius: 6,
          border: '1px solid var(--gd-color-border)',
        }}
      >
        {acao.ferramenta}({JSON.stringify(acao.args, null, 2)})
      </pre>
      {estado === 'pendente' && (
        <div className="gd-row">
          <button type="button" className="gd-btn gd-btn--sm" onClick={onConfirm} disabled={pending}>
            Confirmar e executar
          </button>
          <button type="button" className="gd-btn gd-btn--text gd-btn--sm" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      )}
      {estado === 'executada' && <Badge tone="success">{detalhe ?? 'Executada'}</Badge>}
      {estado === 'cancelada' && <Badge tone="neutral">Cancelada</Badge>}
      {estado === 'erro' && (
        <div className="gd-alert gd-alert--error" role="alert">
          {detalhe}
        </div>
      )}
    </div>
  );
}

export function CopilotoPage(): ReactNode {
  const [mensagens, setMensagens] = useState<Msg[]>([]);
  const [texto, setTexto] = useState('');
  const planejar = useMutation({
    mutationFn: (v: { m: string; h: ChatTurno[] }) => api.copilotoPlanejar(v.m, v.h),
  });
  const executar = useMutation({
    mutationFn: (v: { f: string; a: Record<string, unknown> }) => api.copilotoExecutar(v.f, v.a),
  });

  function enviar(e: FormEvent): void {
    e.preventDefault();
    const m = texto.trim();
    if (m.length < 2 || planejar.isPending) return;
    const hist: ChatTurno[] = mensagens.map((x) => ({
      papel: x.papel,
      texto: x.texto ?? (x.acao ? `(ação proposta: ${x.acao.resumo})` : ''),
    }));
    setMensagens((c) => [...c, { papel: 'user', texto: m }]);
    setTexto('');
    planejar.mutate(
      { m, h: hist },
      {
        onSuccess: (r: CopilotoResposta) =>
          setMensagens((c) => [
            ...c,
            r.tipo === 'confirmar' && r.acao
              ? { papel: 'assistant', acao: r.acao, estado: 'pendente' }
              : { papel: 'assistant', texto: r.texto ?? '' },
          ]),
      },
    );
  }

  function setEstado(idx: number, estado: Estado, detalhe?: string): void {
    setMensagens((c) => c.map((x, i) => (i === idx ? { ...x, estado, detalhe } : x)));
  }

  function confirmar(idx: number): void {
    const msg = mensagens[idx];
    if (!msg.acao) return;
    executar.mutate(
      { f: msg.acao.ferramenta, a: msg.acao.args },
      {
        onSuccess: () => setEstado(idx, 'executada', 'Operação executada e auditada.'),
        onError: (err) =>
          setEstado(idx, 'erro', err instanceof ApiError ? err.message : 'Falha ao executar.'),
      },
    );
  }

  return (
    <>
      <PageHeader
        title="Copiloto"
        description="Opere a plataforma por linguagem natural. O copiloto propõe; você confirma. Ações de escrita rodam com o seu usuário e entram na auditoria."
      />
      <InfoAlert>
        O copiloto nunca executa sozinho: toda ação de escrita exige sua confirmação e respeita o
        seu papel (RBAC). Ex.: “registre o modelo-base GPT-4o da OpenAI, versão 2024-11”, ou
        “quais ferramentas de alto risco estão sem revisão?”.
      </InfoAlert>

      <Card title="Conversa">
        {mensagens.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            {mensagens.map((m, i) => (
              <div key={i} style={bolha(m.papel)}>
                {m.acao ? (
                  <ActionCard
                    acao={m.acao}
                    estado={m.estado}
                    detalhe={m.detalhe}
                    pending={executar.isPending}
                    onConfirm={() => confirmar(i)}
                    onCancel={() => setEstado(i, 'cancelada')}
                  />
                ) : m.papel === 'assistant' ? (
                  <Markdown text={m.texto ?? ''} />
                ) : (
                  <p style={{ margin: 0 }}>{m.texto}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {planejar.isPending && <Loading label="Pensando…" />}
        {planejar.isError && <ErrorAlert error={planejar.error} />}
        <form onSubmit={enviar} style={{ marginTop: 'var(--gd-space-3)' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="gd-input"
              style={{ flex: 1 }}
              placeholder="Peça algo ao copiloto…"
              aria-label="Mensagem para o copiloto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <button
              type="submit"
              className="gd-btn"
              disabled={planejar.isPending || texto.trim().length < 2}
            >
              Enviar
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
