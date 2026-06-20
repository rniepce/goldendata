/* Iniciais para avatares de responsável (fora de IniciativaCard para o módulo
 * exportar apenas componentes — react-refresh). */

export function iniciais(nome?: string | null): string {
  if (!nome) return '?';
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? (p[p.length - 1][0] ?? '') : '')).toUpperCase();
}
