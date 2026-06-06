/*
 * Autenticação OIDC contra Keycloak usando oidc-client-ts.
 * Diretriz CESEC/COARF: OpenID Connect via Keycloak, identidade personalíssima.
 *
 * Expõe:
 *  - userManager: instância única do UserManager (PKCE, code flow);
 *  - getAccessToken(): token corrente para o cabeçalho Authorization;
 *  - AuthProvider + useAuth(): contexto React com estado/ações de sessão.
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

export const userManager = new UserManager({
  authority: env.oidcAuthority,
  client_id: env.oidcClientId,
  redirect_uri: env.oidcRedirectUri,
  post_logout_redirect_uri: window.location.origin,
  response_type: 'code',
  scope: 'openid profile email',
  // PKCE é o padrão para SPA público no oidc-client-ts.
  automaticSilentRenew: true,
  // Mantém a sessão entre reloads sem armazenar tokens fora do escopo do app.
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  monitorSession: true,
});

let currentUser: User | null = null;

userManager.events.addUserLoaded((user) => {
  currentUser = user;
});
userManager.events.addUserUnloaded(() => {
  currentUser = null;
});
userManager.events.addAccessTokenExpired(() => {
  void userManager.signinSilent().catch(() => undefined);
});

/** Token de acesso corrente (usado pelo cliente de API). */
export async function getAccessToken(): Promise<string | null> {
  if (currentUser && !currentUser.expired) {
    return currentUser.access_token;
  }
  const user = await userManager.getUser();
  currentUser = user;
  return user && !user.expired ? user.access_token : null;
}

/** Extrai os papéis do token Keycloak (realm_access.roles), filtrando os conhecidos. */
const KNOWN_ROLES: Role[] = [
  'coordenador_comite',
  'owner_ferramenta',
  'avaliador',
  'auditor_dpo',
  'admin',
];

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
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    let active = true;
    async function bootstrap(): Promise<void> {
      try {
        // Conclui o fluxo de callback, se aplicável.
        if (window.location.pathname.startsWith('/auth/callback')) {
          const oidcUser = await userManager.signinRedirectCallback();
          currentUser = oidcUser;
          window.history.replaceState({}, document.title, '/catalogo');
          if (active) applyUser(oidcUser);
        } else {
          const oidcUser = await userManager.getUser();
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
    userManager.events.addUserLoaded(onLoaded);
    userManager.events.addUserUnloaded(onUnloaded);
    return () => {
      active = false;
      userManager.events.removeUserLoaded(onLoaded);
      userManager.events.removeUserUnloaded(onUnloaded);
    };
  }, [applyUser]);

  const login = useCallback(async () => {
    setError(null);
    await userManager.signinRedirect();
  }, []);

  const logout = useCallback(async () => {
    await userManager.signoutRedirect();
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
