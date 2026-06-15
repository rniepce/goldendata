/*
 * Configuração injetada via variáveis de ambiente (12-factor — Config).
 * Nenhuma credencial/URL fixa no código-fonte (diretriz COARF/CESEC).
 */

type AuthMode = 'none' | 'oidc' | 'supabase';

interface AppEnv {
  apiUrl: string;
  /**
   * Modo de autenticação:
   *  - 'none': SEM LOGIN (demonstração) — usuário demo com todos os papéis;
   *  - 'oidc': login institucional via Keycloak;
   *  - 'supabase': login e-mail+senha via Supabase Auth (JWT validado no backend).
   */
  authMode: AuthMode;
  oidcAuthority: string;
  oidcClientId: string;
  oidcRedirectUri: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  /** Rótulo do ambiente, derivado da authority/host para o indicador visual. */
  ambiente: 'dev' | 'homolog' | 'prod';
}

function detectAmbiente(apiUrl: string): AppEnv['ambiente'] {
  const value = apiUrl.toLowerCase();
  if (value.includes('localhost') || value.includes('127.0.0.1') || value.includes('.dev')) {
    return 'dev';
  }
  if (value.includes('homolog') || value.includes('hml') || value.includes('staging')) {
    return 'homolog';
  }
  return 'prod';
}

const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

const oidcAuthority = import.meta.env.VITE_OIDC_AUTHORITY ?? '';
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

function detectAuthMode(): AuthMode {
  const declared = (import.meta.env.VITE_AUTH_MODE ?? '').toLowerCase();
  if (declared === 'none' || declared === 'oidc' || declared === 'supabase') {
    return declared;
  }
  // Sem declaração explícita: deriva pelo que estiver configurado.
  if (supabaseUrl && supabaseAnonKey) return 'supabase';
  return oidcAuthority ? 'oidc' : 'none';
}

export const env: AppEnv = {
  apiUrl,
  authMode: detectAuthMode(),
  oidcAuthority,
  oidcClientId: import.meta.env.VITE_OIDC_CLIENT_ID ?? '',
  oidcRedirectUri:
    import.meta.env.VITE_OIDC_REDIRECT_URI ?? `${window.location.origin}/auth/callback`,
  supabaseUrl,
  supabaseAnonKey,
  ambiente: detectAmbiente(apiUrl),
};
