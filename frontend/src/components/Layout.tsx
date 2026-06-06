/*
 * Layout institucional com navegação lateral acessível, cabeçalho com identidade
 * do usuário e papéis, e indicador de ambiente (dev/homolog/prod).
 */

import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth, hasAnyRole } from '../lib/auth-oidc';
import { env } from '../lib/env';
import type { Role } from '../lib/types';

interface NavItem {
  to: string;
  label: string;
  /** Papéis que podem ver o item; vazio = todos os autenticados. */
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/golden-datasets', label: 'Golden datasets' },
  { to: '/avaliacoes', label: 'Avaliações' },
  { to: '/anotacao', label: 'Anotação (HITL)', roles: ['avaliador', 'coordenador_comite', 'admin'] },
  { to: '/gate', label: 'Gate de promoção', roles: ['coordenador_comite', 'admin', 'owner_ferramenta'] },
  { to: '/indicadores', label: 'Indicadores' },
  { to: '/auditoria', label: 'Auditoria', roles: ['auditor_dpo', 'coordenador_comite', 'admin'] },
  { to: '/admin', label: 'Administração', roles: ['admin', 'coordenador_comite'] },
];

const ROLE_LABELS: Record<Role, string> = {
  coordenador_comite: 'Coordenador do Comitê',
  owner_ferramenta: 'Owner de ferramenta',
  avaliador: 'Avaliador',
  auditor_dpo: 'Auditor / DPO',
  admin: 'Administrador',
};

const ENV_LABELS: Record<typeof env.ambiente, string> = {
  dev: 'Desenvolvimento',
  homolog: 'Homologação',
  prod: 'Produção',
};

export function Layout(): ReactNode {
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || hasAnyRole(user, ...item.roles),
  );

  return (
    <div className="gd-app">
      <a href="#conteudo-principal" className="gd-skip-link">
        Pular para o conteúdo principal
      </a>

      <header className="gd-header">
        <div className="gd-row">
          <span className={`gd-env-flag gd-env-flag--${env.ambiente}`} title="Ambiente atual">
            {ENV_LABELS[env.ambiente]}
          </span>
          <span className="gd-mono" aria-hidden="true">
            goldendata · governança de IA
          </span>
        </div>
        <div className="gd-row">
          {user && (
            <div className="gd-user">
              <span className="gd-user__name">{user.nome}</span>
              <span className="gd-user__roles">
                {user.roles.length > 0
                  ? user.roles.map((role) => ROLE_LABELS[role]).join(' · ')
                  : 'Sem papéis atribuídos'}
              </span>
            </div>
          )}
          <button type="button" className="gd-btn gd-btn--secondary gd-btn--sm" onClick={() => void logout()}>
            Sair
          </button>
        </div>
      </header>

      <nav className="gd-sidebar" aria-label="Navegação principal">
        <div className="gd-sidebar__brand">
          goldendata
          <span className="gd-visually-hidden"> — plataforma de governança de IA do TJMG</span>
        </div>
        <ul className="gd-nav" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className="gd-nav__link">
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main id="conteudo-principal" className="gd-main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
