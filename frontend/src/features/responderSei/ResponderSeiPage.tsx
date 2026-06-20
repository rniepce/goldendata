/*
 * /responder-sei — Assistente de documentos (SEI).
 *  - #76 Redator: a partir de um processo (colado ou enviado), redige uma minuta
 *    de resposta fundamentada nas diretrizes internas (RAG), citando as fontes.
 *  - #77 Extrair card: sugere os campos de uma iniciativa a partir do documento.
 * A revisão humana do resultado é obrigatória (a IA apoia, não decide).
 */

import { useState, type ChangeEvent, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Badge,
  Card,
  ErrorAlert,
  InfoAlert,
  Loading,
  Markdown,
  PageHeader,
  TextAreaField,
} from '../../components/ui';
import { IniciativaForm } from '../painel/IniciativaForm';

export function ResponderSeiPage(): ReactNode {
  const [texto, setTexto] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [criando, setCriando] = useState(false);

  const redigir = useMutation({ mutationFn: (form: FormData) => api.redigirRespostaSei(form) });
  const extrair = useMutation({ mutationFn: (form: FormData) => api.extrairCard(form) });

  const temEntrada = texto.trim().length > 0 || file !== null;

  function buildForm(): FormData | null {
    if (!temEntrada) return null;
    const f = new FormData();
    if (texto.trim()) f.append('texto', texto.trim());
    if (file) f.append('file', file);
    return f;
  }
  function onRedigir(): void {
    const f = buildForm();
    if (f) {
      setCriando(false);
      redigir.mutate(f);
    }
  }
  function onExtrair(): void {
    const f = buildForm();
    if (f) {
      setCriando(false);
      extrair.mutate(f);
    }
  }
  function onFile(e: ChangeEvent<HTMLInputElement>): void {
    setFile(e.target.files?.[0] ?? null);
  }

  const sugestao = extrair.data?.sugestao;

  return (
    <>
      <PageHeader
        title="Assistente de documentos (SEI)"
        description="Cole ou envie um processo. O assistente redige uma minuta de resposta fundamentada nas diretrizes internas, ou sugere uma iniciativa a partir do documento."
      />

      <InfoAlert>
        O resultado é apoio gerado por IA, fundamentado na base de conhecimento — a revisão e a
        decisão permanecem humanas.
      </InfoAlert>

      <Card title="Documento do processo">
        <TextAreaField
          label="Texto do processo (colar)"
          rows={10}
          value={texto}
          onChange={setTexto}
          hint="Ou envie um arquivo abaixo (.pdf, .docx, .txt)."
        />
        <div className="gd-field">
          <label htmlFor="sei-file">Arquivo do processo</label>
          <input id="sei-file" type="file" accept=".pdf,.docx,.txt,.md" onChange={onFile} />
        </div>
        <div className="gd-row" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="gd-btn"
            onClick={onRedigir}
            disabled={!temEntrada || redigir.isPending}
          >
            {redigir.isPending ? 'Redigindo…' : 'Redigir resposta'}
          </button>
          <button
            type="button"
            className="gd-btn gd-btn--secondary"
            onClick={onExtrair}
            disabled={!temEntrada || extrair.isPending}
          >
            {extrair.isPending ? 'Analisando…' : 'Sugerir iniciativa'}
          </button>
        </div>
      </Card>

      {(redigir.isPending || redigir.isError || redigir.data) && (
        <Card title="Minuta de resposta">
          {redigir.isPending && <Loading label="Redigindo a minuta… (pode levar até 30s)" />}
          {redigir.isError && <ErrorAlert error={redigir.error} />}
          {redigir.data && (
            <>
              <div className="gd-md--panel">
                <Markdown text={redigir.data.minuta} />
              </div>
              {redigir.data.fontes.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.35rem',
                    marginTop: 'var(--gd-space-3)',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 'var(--gd-font-size-sm)', opacity: 0.8 }}>Fontes:</span>
                  {redigir.data.fontes.map((f, n) => (
                    <Badge key={f.documento_id} tone="info">
                      [{n + 1}] {f.titulo}
                    </Badge>
                  ))}
                </div>
              )}
              <p
                style={{
                  fontSize: 'var(--gd-font-size-xs)',
                  color: 'var(--gd-color-text-muted)',
                  marginBottom: 0,
                  marginTop: 'var(--gd-space-3)',
                }}
              >
                Minuta gerada por IA — revise e valide antes de qualquer uso institucional.
              </p>
            </>
          )}
        </Card>
      )}

      {(extrair.isPending || extrair.isError || extrair.data) && (
        <Card title="Iniciativa sugerida">
          {extrair.isPending && <Loading label="Extraindo campos do documento…" />}
          {extrair.isError && <ErrorAlert error={extrair.error} />}
          {extrair.data && sugestao && (
            <>
              <div className="gd-meta-grid">
                <div>
                  <div className="gd-meta__label">Título</div>
                  <div className="gd-meta__value">{sugestao.titulo ?? '—'}</div>
                </div>
                <div>
                  <div className="gd-meta__label">Categoria</div>
                  <div className="gd-meta__value">{sugestao.categoria ?? '—'}</div>
                </div>
                <div>
                  <div className="gd-meta__label">Risco sugerido</div>
                  <div className="gd-meta__value">{sugestao.risco_sugerido ?? '—'}</div>
                </div>
                <div>
                  <div className="gd-meta__label">Processo SEI</div>
                  <div className="gd-meta__value">{sugestao.processo_sei ?? '—'}</div>
                </div>
              </div>
              {sugestao.resumo && (
                <p style={{ marginTop: 'var(--gd-space-3)' }}>{sugestao.resumo}</p>
              )}
              {!criando && (
                <button
                  type="button"
                  className="gd-btn"
                  style={{ marginTop: 'var(--gd-space-3)' }}
                  onClick={() => setCriando(true)}
                >
                  Criar iniciativa com estes dados
                </button>
              )}
            </>
          )}
          {extrair.data && !sugestao && extrair.data.bruto && (
            <>
              <p style={{ color: 'var(--gd-color-text-muted)' }}>
                Não foi possível estruturar os campos automaticamente. Sugestão da IA:
              </p>
              <div className="gd-md--panel">
                <Markdown text={extrair.data.bruto} />
              </div>
            </>
          )}
        </Card>
      )}

      {criando && sugestao && (
        <IniciativaForm
          inicial={{
            titulo: sugestao.titulo,
            resumo: sugestao.resumo,
            categoria: sugestao.categoria,
            processo_sei: sugestao.processo_sei,
          }}
          onCreated={() => setCriando(false)}
        />
      )}
    </>
  );
}
