import type { CSSProperties, ReactNode } from 'react';
import { Badge } from '../../components/ui';
import { CATEGORIA_META, PRIORIDADE_META, STATUS_META } from '../../lib/options';
import type { Iniciativa } from '../../lib/types';

export function iniciais(nome?: string | null): string {
  if (!nome) return '?';
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? (p[p.length - 1][0] ?? '') : '')).toUpperCase();
}

export function IniciativaCard({
  item,
  onOpen,
}: {
  item: Iniciativa;
  onOpen: (i: Iniciativa) => void;
}): ReactNode {
  const cat = CATEGORIA_META[item.categoria];
  const st = STATUS_META[item.status];
  const pr = PRIORIDADE_META[item.prioridade];
  return (
    <button
      type="button"
      className="painel-card"
      style={{ '--cat-cor': cat.cor } as CSSProperties}
      onClick={() => onOpen(item)}
    >
      <h4 className="painel-card__titulo">{item.titulo}</h4>
      <div className="painel-card__resp">
        <span className="painel-avatar" style={{ background: cat.cor }}>
          {iniciais(item.responsavel_nome)}
        </span>
        {item.responsavel_nome ?? 'Sem responsável'}
      </div>
      <div className="painel-card__badges">
        <Badge tone={cat.tone}>{cat.label}</Badge>
        <Badge tone={st.tone}>{st.label}</Badge>
        {item.prioridade === 'alta' && <Badge tone={pr.tone}>Prioridade alta</Badge>}
      </div>
      {item.resumo && <div className="painel-card__resumo">{item.resumo}</div>}
    </button>
  );
}
