/*
 * Cliente Supabase Auth (modo 'supabase'). Instanciado de forma preguiçosa —
 * só quando env.authMode === 'supabase'. A sessão (access/refresh token) é
 * persistida e renovada automaticamente pelo supabase-js.
 */

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';
import type { Role, UserInfo } from './types';

const KNOWN_ROLES: Role[] = [
  'coordenador_comite',
  'owner_ferramenta',
  'avaliador',
  'auditor_dpo',
  'admin',
];

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}

/** Converte a sessão do Supabase no UserInfo da aplicação (papéis em app_metadata.roles). */
export function userFromSession(session: Session | null): UserInfo | null {
  if (!session?.user) return null;
  const meta = (session.user.app_metadata ?? {}) as { roles?: string[] };
  const umeta = (session.user.user_metadata ?? {}) as { nome?: string; name?: string };
  const roles = (meta.roles ?? []).filter((r): r is Role => KNOWN_ROLES.includes(r as Role));
  return {
    sub: session.user.id,
    nome: umeta.nome ?? umeta.name ?? session.user.email ?? 'Usuário',
    email: session.user.email ?? '',
    roles,
  };
}
