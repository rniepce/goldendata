import type { ReactNode } from 'react';
import type { Iniciativa } from '../../lib/types';

function atrasada(i: Iniciativa): boolean {
  if (!i.prazo || i.status === 'concluido' || i.status === 'cancelado') return false;
  const d = new Date(i.prazo + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return d < hoje;
}

export function KpiBar({ itens }: { itens: Iniciativa[] }): ReactNode {
  const total = itens.length;
  const emAndamento = itens.filter((i) => i.status === 'em_andamento').length;
  const aFazer = itens.filter((i) => i.status === 'a_fazer').length;
  const concluidas = itens.filter((i) => i.status === 'concluido').length;
  const atrasadas = itens.filter(atrasada).length;

  const cards: { num: number; label: string; cor: string }[] = [
    { num: total, label: 'Iniciativas', cor: '#2563eb' },
    { num: emAndamento, label: 'Em andamento', cor: '#0891b2' },
    { num: aFazer, label: 'A fazer', cor: '#6b7280' },
    { num: concluidas, label: 'Concluídas', cor: '#16a34a' },
    { num: atrasadas, label: 'Atrasadas', cor: '#dc2626' },
  ];

  return (
    <div className="painel-kpis">
      {cards.map((c) => (
        <div key={c.label} className="painel-kpi" style={{ '--kpi-cor': c.cor } as React.CSSProperties}>
          <div className="painel-kpi__num" style={{ color: c.num > 0 && c.label === 'Atrasadas' ? c.cor : undefined }}>
            {c.num}
          </div>
          <div className="painel-kpi__label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
