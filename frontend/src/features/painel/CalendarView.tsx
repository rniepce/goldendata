import { useMemo, useState, type ReactNode } from 'react';
import { CATEGORIA_META } from '../../lib/options';
import type { Iniciativa } from '../../lib/types';

const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CalendarView({
  itens,
  onOpen,
}: {
  itens: Iniciativa[];
  onOpen: (i: Iniciativa) => void;
}): ReactNode {
  const hoje = new Date();
  const [cursor, setCursor] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });

  // mapa prazo(YYYY-MM-DD) -> iniciativas
  const porDia = useMemo(() => {
    const m = new Map<string, Iniciativa[]>();
    for (const i of itens) {
      if (!i.prazo) continue;
      const arr = m.get(i.prazo) ?? [];
      arr.push(i);
      m.set(i.prazo, arr);
    }
    return m;
  }, [itens]);

  const semPrazo = itens.filter((i) => !i.prazo).length;

  // grade do mês: começa no domingo da semana do dia 1
  const primeiro = new Date(cursor.ano, cursor.mes, 1);
  const inicioGrade = new Date(primeiro);
  inicioGrade.setDate(1 - primeiro.getDay());
  const dias: Date[] = Array.from({ length: 42 }, (_, k) => {
    const d = new Date(inicioGrade);
    d.setDate(inicioGrade.getDate() + k);
    return d;
  });
  const hojeStr = ymd(hoje);
  const titulo = primeiro.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  function navega(delta: number): void {
    setCursor((c) => {
      const d = new Date(c.ano, c.mes + delta, 1);
      return { ano: d.getFullYear(), mes: d.getMonth() };
    });
  }

  return (
    <div>
      <div className="painel-cal__head">
        <button type="button" className="gd-btn gd-btn--secondary gd-btn--sm" onClick={() => navega(-1)} aria-label="Mês anterior">
          ‹
        </button>
        <h3>{titulo}</h3>
        <button type="button" className="gd-btn gd-btn--secondary gd-btn--sm" onClick={() => navega(1)} aria-label="Próximo mês">
          ›
        </button>
        <button type="button" className="gd-btn gd-btn--secondary gd-btn--sm" onClick={() => setCursor({ ano: hoje.getFullYear(), mes: hoje.getMonth() })}>
          Hoje
        </button>
        {semPrazo > 0 && (
          <span style={{ color: 'var(--gd-color-text-muted)', fontSize: 'var(--gd-font-size-sm)' }}>
            {semPrazo} iniciativa(s) sem prazo definido
          </span>
        )}
      </div>

      <div className="painel-cal__grid" role="grid">
        {DOW.map((d) => (
          <div key={d} className="painel-cal__dow">{d}</div>
        ))}
        {dias.map((d) => {
          const key = ymd(d);
          const foraMes = d.getMonth() !== cursor.mes;
          const eventos = porDia.get(key) ?? [];
          return (
            <div key={key} className={`painel-cal__cel${foraMes ? ' painel-cal__cel--fora' : ''}${key === hojeStr ? ' painel-cal__cel--hoje' : ''}`}>
              <div className="painel-cal__dia">{d.getDate()}</div>
              {eventos.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  className="painel-cal__ev"
                  style={{ background: CATEGORIA_META[ev.categoria].cor }}
                  title={ev.titulo}
                  onClick={() => onOpen(ev)}
                >
                  {ev.titulo}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
