/*
 * Tela de espera durante o retorno do fluxo OIDC (/auth/callback).
 * O processamento do código é feito no AuthProvider; aqui apenas exibimos feedback.
 */

import type { ReactNode } from 'react';
import { Loading } from '../../components/ui';

export function CallbackScreen(): ReactNode {
  return (
    <main
      style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}
      aria-live="polite"
    >
      <Loading label="Concluindo autenticação…" />
    </main>
  );
}
