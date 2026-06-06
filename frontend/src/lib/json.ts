/*
 * Utilitário de parsing de JSON com mensagem de erro em pt-BR.
 * Usado em campos que aceitam objetos/listas JSON (config, contexto, etc.).
 */

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseJsonObject(text: string): ParseResult<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'O conteúdo deve ser um objeto JSON válido (entre chaves).' };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, error: 'JSON inválido. Verifique a sintaxe.' };
  }
}

export function parseJsonArray<T = unknown>(text: string): ParseResult<T[]> {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) {
      return { ok: false, error: 'O conteúdo deve ser uma lista JSON (entre colchetes).' };
    }
    return { ok: true, value: parsed as T[] };
  } catch {
    return { ok: false, error: 'JSON inválido. Verifique a sintaxe.' };
  }
}

/** Divide uma string em itens por vírgula ou quebra de linha, removendo vazios. */
export function splitList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
