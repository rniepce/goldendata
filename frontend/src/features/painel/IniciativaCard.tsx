import type { CSSProperties, ReactNode } from 'react';
import { Badge } from '../../components/ui';
import { CATEGORIA_META, PRIORIDADE_META, STATUS_META } from '../../lib/options';
import type { Iniciativa, IniciativaCategoria } from '../../lib/types';

export function iniciais(nome?: string | null): string {
  if (!nome) return '?';
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? (p[p.length - 1][0] ?? '') : '')).toUpperCase();
}

/** Badge de categoria com a cor própria da categoria (reutilizado no drawer). */
export function CategoriaBadge({ categoria }: { categoria: IniciativaCategoria }): ReactNode {
  const c = CATEGORIA_META[categoria];
  return (
    <span className="painel-cat-badge" style={{ color: c.cor, borderColor: `${c.cor}66`, background: `${c.cor}14` }}>
      {c.label}
    </span>
  );
}

function formatPrazo(prazo: string): { texto: string; vencido: boolean } {
  const d = new Date(prazo + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return { texto: d.toLocaleDateString('pt-BR'), vencido: d < hoje };
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
  const pri = PRIORIDADE_META[item.prioridade];
  const prazo = item.prazo ? formatPrazo(item.prazo) : null;
  return (
    <button
      type="button"
      className="painel-card"
      style={{ '--cat-cor': cat.cor } as CSSProperties}
      onClick={() => onOpen(item)}
    >
      <span
        className="painel-card__pri"
        style={{ background: pri.cor }}
        role="img"
        aria-label={`Prioridade ${pri.label.toLowerCase()}`}
        title={`Prioridade ${pri.label.toLowerCase()}`}
      />
      <h4 className="painel-card__titulo">{item.titulo}</h4>
      <div className="painel-card__resp">
        <span className="painel-avatar" style={{ background: cat.cor }}>
          {iniciais(item.responsavel_nome)}
        </span>
        {item.responsavel_nome ?? 'Sem responsável'}
      </div>
      <div className="painel-card__badges">
        <CategoriaBadge categoria={item.categoria} />
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>
      {prazo && (
        <div className={`painel-card__prazo${prazo.vencido && item.status !== 'concluido' ? ' painel-card__prazo--vencido' : ''}`}>
          📅 {prazo.vencido && item.status !== 'concluido' ? 'Venceu em ' : 'Prazo: '}
          {prazo.texto}
        </div>
      )}
      {!!item.comentarios_abertos && (
        <div className="painel-card__coment" title={`${item.comentarios_abertos} comentário(s) em aberto`}>
          💬 {item.comentarios_abertos} comentário{item.comentarios_abertos > 1 ? 's' : ''}
        </div>
      )}
      {item.resumo && <div className="painel-card__resumo">{item.resumo}</div>}
    </button>
  );
}
