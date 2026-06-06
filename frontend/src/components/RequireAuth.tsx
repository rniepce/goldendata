/*
 * Guarda de rota: exige sessão OIDC autenticada e, opcionalmente, papéis (RBAC).
 */

import type { ReactNode } from 'react';
import { useAuth, hasAnyRole } from '../lib/auth-oidc';
import type { Role } from '../lib/types';
import { Loading } from './ui';
import { LoginScreen } from '../features/auth/LoginScreen';

export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Role[];
}): ReactNode {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return <Loading label="Verificando sessão…" />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (roles && !hasAnyRole(user, ...roles)) {
    return (
      <div className="gd-main" role="alert">
        <div className="gd-alert gd-alert--warning">
          Você não possui o papel necessário para acessar esta área. Solicite acesso ao
          administrador da plataforma.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
