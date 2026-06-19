import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge, ErrorAlert, MetaItem, SelectField, SuccessAlert, TextAreaField, TextField } from '../../components/ui';
import {
  CATEGORIA_OPTIONS,
  MEMBROS_GEXIA,
  PRIORIDADE_META,
  PRIORIDADE_OPTIONS,
  STATUS_INICIATIVA_OPTIONS,
  STATUS_META,
} from '../../lib/options';
import { useAuth, hasAnyRole } from '../../lib/auth-oidc';
import { useUpdateIniciativa, useDeleteIniciativa } from '../../lib/queries';
import type {
  Iniciativa,
  IniciativaCategoria,
  IniciativaPrioridade,
  IniciativaStatus,
} from '../../lib/types';
import { CategoriaBadge } from './IniciativaCard';
import { IniciativaComentarios } from './IniciativaComentarios';

const RESP_OPTIONS = [
  { value: '', label: 'Sem responsável' },
  ...MEMBROS_GEXIA.map((m) => ({ value: m.email, label: m.nome })),
];

export function IniciativaDrawer({
  item,
  onClose,
}: {
  item: Iniciativa;
  onClose: () => void;
}): ReactNode {
  const { user } = useAuth();
  const podeEditar = hasAnyRole(user, 'owner_ferramenta', 'coordenador_comite', 'admin');
  const update = useUpdateIniciativa();
  const remove = useDeleteIniciativa();

  const [titulo, setTitulo] = useState(item.titulo);
  const [resumo, setResumo] = useState(item.resumo ?? '');
  const [categoria, setCategoria] = useState<IniciativaCategoria>(item.categoria);
  const [status, setStatus] = useState<IniciativaStatus>(item.status);
  const [prioridade, setPrioridade] = useState<IniciativaPrioridade>(item.prioridade);
  const [respEmail, setRespEmail] = useState(item.responsavel_email ?? '');
  const [prazo, setPrazo] = useState(item.prazo ?? '');
  const [sei, setSei] = useState(item.processo_sei ?? '');
  const [salvo, setSalvo] = useState(false);

  // Fecha o drawer com Escape (acessibilidade — navegação por teclado).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function salvar(): void {
    setSalvo(false);
    const nome = MEMBROS_GEXIA.find((m) => m.email === respEmail)?.nome ?? null;
    update.mutate(
      {
        id: item.id,
        input: {
          titulo: titulo.trim(),
          resumo: resumo.trim() || null,
          categoria,
          status,
          prioridade,
          responsavel_email: respEmail || null,
          responsavel_nome: nome,
          prazo: prazo || null,
          processo_sei: sei.trim() || null,
        },
      },
      { onSuccess: () => setSalvo(true) },
    );
  }

  return (
    <div className="painel-drawer__overlay" role="presentation" onClick={onClose}>
      <aside className="painel-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Detalhes da iniciativa">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--gd-font-size-lg)' }}>{item.titulo}</h2>
          <button className="painel-drawer__close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.6rem 0 1rem' }}>
          <CategoriaBadge categoria={categoria} />
          <Badge tone={STATUS_META[status].tone}>{STATUS_META[status].label}</Badge>
          <Badge tone={PRIORIDADE_META[prioridade].tone}>
            Prioridade {PRIORIDADE_META[prioridade].label.toLowerCase()}
          </Badge>
        </div>

        {item.tool_id && (
          <p style={{ marginTop: 0 }}>
            <Link className="gd-btn gd-btn--secondary gd-btn--sm" to={`/ferramentas/${item.tool_id}`}>
              Abrir ficha técnica da solução
            </Link>
          </p>
        )}

        {podeEditar ? (
          <div style={{ marginTop: '0.5rem' }}>
            {update.isError && <ErrorAlert error={update.error} />}
            {salvo && <SuccessAlert>Alterações salvas.</SuccessAlert>}
            <TextField label="Título" required value={titulo} onChange={setTitulo} />
            <TextAreaField label="Resumo" value={resumo} onChange={setResumo} hint="Aparece ao passar o mouse no card." />
            <div className="gd-form-grid">
              <SelectField label="Categoria" value={categoria} onChange={(v) => setCategoria(v as IniciativaCategoria)} options={CATEGORIA_OPTIONS} />
              <SelectField label="Status" value={status} onChange={(v) => setStatus(v as IniciativaStatus)} options={STATUS_INICIATIVA_OPTIONS} />
              <SelectField label="Prioridade" value={prioridade} onChange={(v) => setPrioridade(v as IniciativaPrioridade)} options={PRIORIDADE_OPTIONS} />
              <SelectField label="Responsável" value={respEmail} onChange={setRespEmail} options={RESP_OPTIONS} />
              <TextField label="Prazo" type="date" value={prazo} onChange={setPrazo} />
              <TextField label="Processo SEI" value={sei} onChange={setSei} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="gd-btn" disabled={update.isPending || !titulo.trim()} onClick={salvar}>
                {update.isPending ? 'Salvando…' : 'Salvar alterações'}
              </button>
              <button
                type="button"
                className="gd-btn gd-btn--secondary gd-btn--sm"
                style={{ color: 'var(--gd-color-danger)' }}
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm(`Excluir a iniciativa "${item.titulo}"?`)) {
                    remove.mutate(item.id, { onSuccess: onClose });
                  }
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        ) : (
          <>
            {item.resumo && <p style={{ lineHeight: 1.5 }}>{item.resumo}</p>}
            <div className="gd-meta-grid" style={{ marginTop: '1rem' }}>
              <MetaItem label="Responsável">{item.responsavel_nome ?? '—'}</MetaItem>
              <MetaItem label="Processo SEI">{item.processo_sei ?? '—'}</MetaItem>
              <MetaItem label="Prazo">{item.prazo ?? '—'}</MetaItem>
              <MetaItem label="Atualizado em">
                {new Date(item.atualizado_em).toLocaleDateString('pt-BR')}
              </MetaItem>
            </div>
          </>
        )}

        <IniciativaComentarios iniciativaId={item.id} />
      </aside>
    </div>
  );
}
