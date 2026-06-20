/*
 * Layout institucional com navegação lateral acessível, cabeçalho com identidade
 * do usuário e papéis, e indicador de ambiente (dev/homolog/prod).
 */

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Loading } from './ui';
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
  { to: '/painel', label: 'Painel' },
  { to: '/busca', label: 'Busca' },
  { to: '/conhecimento', label: 'Conhecimento' },
  {
    to: '/responder-sei',
    label: 'Responder SEI',
    roles: ['owner_ferramenta', 'coordenador_comite', 'admin'],
  },
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
  const [menuOpen, setMenuOpen] = useState(false);

  // Fecha a gaveta de navegação (mobile) ao pressionar Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

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
          <button
            type="button"
            className="gd-hamburger"
            aria-label={menuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            aria-expanded={menuOpen}
            aria-controls="gd-sidebar-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ☰
          </button>
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
          {env.authMode !== 'none' && (
            <button
              type="button"
              className="gd-btn gd-btn--secondary gd-btn--sm"
              onClick={() => void logout()}
            >
              Sair
            </button>
          )}
        </div>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="gd-sidebar-backdrop"
          aria-label="Fechar menu de navegação"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <nav
        id="gd-sidebar-nav"
        className={`gd-sidebar${menuOpen ? ' gd-sidebar--open' : ''}`}
        aria-label="Navegação principal"
      >
        <div className="gd-sidebar__brand">
          goldendata
          <span className="gd-visually-hidden"> — plataforma de governança de IA do TJMG</span>
        </div>
        <ul className="gd-nav" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className="gd-nav__link" onClick={() => setMenuOpen(false)}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main id="conteudo-principal" className="gd-main" tabIndex={-1}>
        <Suspense fallback={<Loading label="Carregando…" />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
