/*
 * Tela de acesso.
 *  - modo 'supabase': formulário e-mail+senha (Supabase Auth);
 *  - modo 'oidc': redirect para o Keycloak (autenticação única).
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../../lib/auth-oidc';
import { env } from '../../lib/env';
import { TextField } from '../../components/ui';

export function LoginScreen(): ReactNode {
  const { login, loginPassword, error } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    try {
      await loginPassword(email.trim(), senha);
    } catch {
      // erro já exibido via auth.error
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 'var(--gd-space-5)' }}>
      <section
        className="gd-card"
        style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}
        aria-labelledby="login-title"
      >
        <h1 id="login-title" style={{ color: 'var(--gd-color-primary)' }}>
          goldendata
        </h1>
        <p>Plataforma institucional de governança de IA do TJMG.</p>

        {error && (
          <div className="gd-alert gd-alert--error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        {env.authMode === 'supabase' ? (
          <form onSubmit={onSubmit} style={{ textAlign: 'left', marginTop: 'var(--gd-space-4)' }}>
            <TextField
              label="E-mail"
              type="email"
              required
              value={email}
              onChange={setEmail}
              placeholder="seu.email@tjmg.jus.br"
            />
            <TextField label="Senha" type="password" required value={senha} onChange={setSenha} />
            <button
              type="submit"
              className="gd-btn"
              disabled={submitting}
              style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--gd-space-2)' }}
            >
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        ) : (
          <>
            <p style={{ color: 'var(--gd-color-text-muted)', fontSize: 'var(--gd-font-size-sm)' }}>
              O acesso é feito com sua identidade institucional via Keycloak (autenticação única).
            </p>
            <button
              type="button"
              className="gd-btn"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => void login()}
            >
              Entrar com a conta institucional
            </button>
          </>
        )}
      </section>
    </main>
  );
}
