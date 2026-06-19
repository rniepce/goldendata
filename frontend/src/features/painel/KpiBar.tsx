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

  const cards: { num: number; label: string; cor: string; alerta?: boolean }[] = [
    { num: total, label: 'Iniciativas', cor: 'var(--gd-color-kpi-total)' },
    { num: emAndamento, label: 'Em andamento', cor: 'var(--gd-color-kpi-andamento)' },
    { num: aFazer, label: 'A fazer', cor: 'var(--gd-color-kpi-afazer)' },
    { num: concluidas, label: 'Concluídas', cor: 'var(--gd-color-kpi-concluido)' },
    { num: atrasadas, label: 'Atrasadas', cor: 'var(--gd-color-kpi-atrasado)', alerta: true },
  ];

  return (
    <div className="painel-kpis">
      {cards.map((c) => (
        <div key={c.label} className="painel-kpi" style={{ '--kpi-cor': c.cor } as React.CSSProperties}>
          <div className="painel-kpi__num" style={{ color: c.alerta && c.num > 0 ? c.cor : undefined }}>
            {c.num}
          </div>
          <div className="painel-kpi__label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
