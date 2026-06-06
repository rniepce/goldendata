/*
 * Configuração injetada via variáveis de ambiente (12-factor — Config).
 * Nenhuma credencial/URL fixa no código-fonte (diretriz COARF/CESEC).
 */

interface AppEnv {
  apiUrl: string;
  oidcAuthority: string;
  oidcClientId: string;
  oidcRedirectUri: string;
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

export const env: AppEnv = {
  apiUrl,
  oidcAuthority: import.meta.env.VITE_OIDC_AUTHORITY ?? '',
  oidcClientId: import.meta.env.VITE_OIDC_CLIENT_ID ?? '',
  oidcRedirectUri:
    import.meta.env.VITE_OIDC_REDIRECT_URI ?? `${window.location.origin}/auth/callback`,
  ambiente: detectAmbiente(apiUrl),
};
