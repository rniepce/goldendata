import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge, MetaItem, SelectField } from '../../components/ui';
import {
  CATEGORIA_META,
  MEMBROS_GEXIA,
  PRIORIDADE_META,
  STATUS_INICIATIVA_OPTIONS,
  STATUS_META,
} from '../../lib/options';
import { useAuth, hasAnyRole } from '../../lib/auth-oidc';
import { useUpdateIniciativa, useDeleteIniciativa } from '../../lib/queries';
import type { Iniciativa, IniciativaStatus } from '../../lib/types';

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
  const [status, setStatus] = useState<IniciativaStatus>(item.status);
  const [respEmail, setRespEmail] = useState(item.responsavel_email ?? '');

  const cat = CATEGORIA_META[item.categoria];

  function salvarStatus(novo: string): void {
    setStatus(novo as IniciativaStatus);
    update.mutate({ id: item.id, input: { status: novo as IniciativaStatus } });
  }
  function salvarResponsavel(email: string): void {
    setRespEmail(email);
    const nome = MEMBROS_GEXIA.find((m) => m.email === email)?.nome ?? null;
    update.mutate({ id: item.id, input: { responsavel_email: email || null, responsavel_nome: nome } });
  }

  return (
    <div className="painel-drawer__overlay" onClick={onClose}>
      <aside className="painel-drawer" onClick={(e) => e.stopPropagation()} aria-label="Detalhes da iniciativa">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{item.titulo}</h2>
          <button className="painel-drawer__close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.6rem 0 1rem' }}>
          <Badge tone={cat.tone}>{cat.label}</Badge>
          <Badge tone={STATUS_META[status].tone}>{STATUS_META[status].label}</Badge>
          <Badge tone={PRIORIDADE_META[item.prioridade].tone}>
            Prioridade {PRIORIDADE_META[item.prioridade].label.toLowerCase()}
          </Badge>
        </div>

        {item.resumo && <p style={{ lineHeight: 1.5 }}>{item.resumo}</p>}

        <div className="gd-meta-grid" style={{ margin: '1rem 0' }}>
          <MetaItem label="Responsável">{item.responsavel_nome ?? '—'}</MetaItem>
          <MetaItem label="Processo SEI">{item.processo_sei ?? '—'}</MetaItem>
          <MetaItem label="Prazo">{item.prazo ?? '—'}</MetaItem>
          <MetaItem label="Atualizado em">
            {new Date(item.atualizado_em).toLocaleDateString('pt-BR')}
          </MetaItem>
        </div>

        {item.tool_id && (
          <Link className="gd-btn gd-btn--secondary gd-btn--sm" to={`/ferramentas/${item.tool_id}`}>
            Abrir ficha técnica da solução
          </Link>
        )}

        {podeEditar && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--gd-color-border)', paddingTop: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem' }}>Gerir</h3>
            <SelectField label="Status" value={status} onChange={salvarStatus} options={STATUS_INICIATIVA_OPTIONS} />
            <SelectField label="Responsável" value={respEmail} onChange={salvarResponsavel} options={RESP_OPTIONS} />
            <button
              type="button"
              className="gd-btn gd-btn--secondary gd-btn--sm"
              style={{ marginTop: '0.5rem', color: 'var(--gd-color-danger, #dc2626)' }}
              disabled={remove.isPending}
              onClick={() => {
                if (confirm(`Excluir a iniciativa "${item.titulo}"?`)) {
                  remove.mutate(item.id, { onSuccess: onClose });
                }
              }}
            >
              Excluir iniciativa
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
