/*
 * Camada de autenticação com MODOS comutáveis (env.authMode):
 *
 *  - 'none' — SEM LOGIN (demonstração): todo acesso usa um usuário demo com
 *    todos os papéis; nenhum token é enviado (o backend, em GOLDENDATA_AUTH_MODE
 *    =none, também dispensa o Authorization). NÃO usar com dados reais.
 *
 *  - 'oidc' — login institucional via Keycloak (oidc-client-ts, PKCE/code flow).
 *    Diretriz CESEC/COARF para produção: OIDC + MFA, identidade personalíssima.
 *
 * Exposto (estável para o restante do app):
 *  - getAccessToken(): token corrente para o cabeçalho Authorization (null em 'none');
 *  - AuthProvider + useAuth(): contexto React com estado/ações de sessão;
 *  - hasAnyRole(): verificação RBAC.
 */

import { UserManager, WebStorageStateStore, User } from 'oidc-client-ts';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { env } from './env';
import type { Role, UserInfo } from './types';

const KNOWN_ROLES: Role[] = [
  'coordenador_comite',
  'owner_ferramenta',
  'avaliador',
  'auditor_dpo',
  'admin',
];

/** Usuário fixo do modo de demonstração (espelha o backend em auth_mode=none). */
const DEMO_USER: UserInfo = {
  sub: 'demo',
  nome: 'Usuário de Demonstração',
  email: 'demo@tjmg.jus.br',
  roles: [...KNOWN_ROLES],
};

// ---------------------------------------------------------------------------
// Modo OIDC — UserManager preguiçoso (só instancia quando o modo é 'oidc')
// ---------------------------------------------------------------------------

let manager: UserManager | null = null;
let currentUser: User | null = null;

function getUserManager(): UserManager {
  if (!manager) {
    manager = new UserManager({
      authority: env.oidcAuthority,
      client_id: env.oidcClientId,
      redirect_uri: env.oidcRedirectUri,
      post_logout_redirect_uri: window.location.origin,
      response_type: 'code',
      scope: 'openid profile email',
      automaticSilentRenew: true,
      userStore: new WebStorageStateStore({ store: window.localStorage }),
      monitorSession: true,
    });
    manager.events.addUserLoaded((user) => {
      currentUser = user;
    });
    manager.events.addUserUnloaded(() => {
      currentUser = null;
    });
    manager.events.addAccessTokenExpired(() => {
      void manager?.signinSilent().catch(() => undefined);
    });
  }
  return manager;
}

/** Token de acesso corrente (usado pelo cliente de API). Null no modo 'none'. */
export async function getAccessToken(): Promise<string | null> {
  if (env.authMode === 'none') {
    return null;
  }
  if (currentUser && !currentUser.expired) {
    return currentUser.access_token;
  }
  const user = await getUserManager().getUser();
  currentUser = user;
  return user && !user.expired ? user.access_token : null;
}

function rolesFromUser(user: User): Role[] {
  const profile = user.profile as Record<string, unknown>;
  const realmAccess = profile.realm_access as { roles?: string[] } | undefined;
  const roles = realmAccess?.roles ?? [];
  return roles.filter((role): role is Role => KNOWN_ROLES.includes(role as Role));
}

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: UserInfo | null;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [user, setUser] = useState<UserInfo | null>(env.authMode === 'none' ? DEMO_USER : null);
  const [isLoading, setIsLoading] = useState(env.authMode !== 'none');
  const [error, setError] = useState<string | null>(null);

  const applyUser = useCallback((oidcUser: User | null) => {
    if (!oidcUser || oidcUser.expired) {
      setUser(null);
      return;
    }
    const profile = oidcUser.profile as Record<string, unknown>;
    setUser({
      sub: oidcUser.profile.sub,
      nome: (profile.name as string) ?? (profile.preferred_username as string) ?? 'Usuário',
      email: (profile.email as string) ?? '',
      roles: rolesFromUser(oidcUser),
    });
  }, []);

  useEffect(() => {
    if (env.authMode === 'none') {
      return; // sem fluxo de login: o usuário demo já está aplicado.
    }
    let active = true;
    const um = getUserManager();
    async function bootstrap(): Promise<void> {
      try {
        if (window.location.pathname.startsWith('/auth/callback')) {
          const oidcUser = await um.signinRedirectCallback();
          currentUser = oidcUser;
          window.history.replaceState({}, document.title, '/catalogo');
          if (active) applyUser(oidcUser);
        } else {
          const oidcUser = await um.getUser();
          currentUser = oidcUser;
          if (active) applyUser(oidcUser);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Falha na autenticação.');
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void bootstrap();

    const onLoaded = (oidcUser: User): void => applyUser(oidcUser);
    const onUnloaded = (): void => setUser(null);
    um.events.addUserLoaded(onLoaded);
    um.events.addUserUnloaded(onUnloaded);
    return () => {
      active = false;
      um.events.removeUserLoaded(onLoaded);
      um.events.removeUserUnloaded(onUnloaded);
    };
  }, [applyUser]);

  const login = useCallback(async () => {
    if (env.authMode === 'none') {
      return;
    }
    setError(null);
    await getUserManager().signinRedirect();
  }, []);

  const logout = useCallback(async () => {
    if (env.authMode === 'none') {
      return;
    }
    await getUserManager().signoutRedirect();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      isLoading,
      isAuthenticated: user !== null,
      user,
      error,
      login,
      logout,
    }),
    [isLoading, user, error, login, logout],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }
  return ctx;
}

/** Verifica se o usuário possui ao menos um dos papéis informados (RBAC). */
export function hasAnyRole(user: UserInfo | null, ...roles: Role[]): boolean {
  if (!user) return false;
  return user.roles.some((role) => roles.includes(role));
}
