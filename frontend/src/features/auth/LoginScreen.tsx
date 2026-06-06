/*
 * Tela de acesso. O login efetivo ocorre via redirect OIDC para o Keycloak.
 */

import type { ReactNode } from 'react';
import { useAuth } from '../../lib/auth-oidc';
import { env } from '../../lib/env';

export function LoginScreen(): ReactNode {
  const { login, error } = useAuth();

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--gd-space-5)',
      }}
    >
      <section
        className="gd-card"
        style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}
        aria-labelledby="login-title"
      >
        <h1 id="login-title" style={{ color: 'var(--gd-color-primary)' }}>
          goldendata
        </h1>
        <p>Plataforma institucional de governança de IA do TJMG.</p>
        <p style={{ color: 'var(--gd-color-text-muted)', fontSize: 'var(--gd-font-size-sm)' }}>
          O acesso é feito com sua identidade institucional via Keycloak (autenticação única).
        </p>

        {error && (
          <div className="gd-alert gd-alert--error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        <button
          type="button"
          className="gd-btn"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => void login()}
        >
          Entrar com a conta institucional
        </button>

        <p
          className="gd-mono"
          style={{ marginTop: 'var(--gd-space-4)', color: 'var(--gd-color-text-muted)' }}
        >
          Realm: {env.oidcAuthority || '(não configurado)'}
        </p>
      </section>
    </main>
  );
}
