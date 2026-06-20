/*
 * Definição de rotas da aplicação. Cada feature é uma pasta em src/features/.
 * Rotas protegidas por sessão OIDC e, quando aplicável, por papéis (RBAC).
 */

import { lazy, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { CallbackScreen } from './features/auth/CallbackScreen';

// Páginas carregadas sob demanda (code-splitting): cada rota vira um chunk,
// tirando bibliotecas pesadas (ex.: gráficos dos Indicadores) do bundle inicial.
const PainelPage = lazy(() => import('./features/painel/PainelPage').then((m) => ({ default: m.PainelPage })));
const BuscaPage = lazy(() => import('./features/busca/BuscaPage').then((m) => ({ default: m.BuscaPage })));
const CatalogPage = lazy(() => import('./features/catalog/CatalogPage').then((m) => ({ default: m.CatalogPage })));
const ToolDetailPage = lazy(() => import('./features/toolDetail/ToolDetailPage').then((m) => ({ default: m.ToolDetailPage })));
const ToolVersionsPage = lazy(() => import('./features/toolVersions/ToolVersionsPage').then((m) => ({ default: m.ToolVersionsPage })));
const GoldenDatasetsPage = lazy(() => import('./features/goldenDatasets/GoldenDatasetsPage').then((m) => ({ default: m.GoldenDatasetsPage })));
const EvaluationsPage = lazy(() => import('./features/evaluations/EvaluationsPage').then((m) => ({ default: m.EvaluationsPage })));
const AnnotationPage = lazy(() => import('./features/annotation/AnnotationPage').then((m) => ({ default: m.AnnotationPage })));
const GatePage = lazy(() => import('./features/gate/GatePage').then((m) => ({ default: m.GatePage })));
const IndicatorsPage = lazy(() => import('./features/indicators/IndicatorsPage').then((m) => ({ default: m.IndicatorsPage })));
const AuditPage = lazy(() => import('./features/audit/AuditPage').then((m) => ({ default: m.AuditPage })));
const AdminPage = lazy(() => import('./features/admin/AdminPage').then((m) => ({ default: m.AdminPage })));

export function App(): ReactNode {
  return (
    <Routes>
      <Route path="/auth/callback" element={<CallbackScreen />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/painel" replace />} />
        <Route path="/painel" element={<PainelPage />} />
        <Route path="/busca" element={<BuscaPage />} />
        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/ferramentas/:id" element={<ToolDetailPage />} />
        <Route path="/ferramentas/:id/versoes" element={<ToolVersionsPage />} />
        <Route path="/golden-datasets" element={<GoldenDatasetsPage />} />
        <Route path="/avaliacoes" element={<EvaluationsPage />} />
        <Route
          path="/anotacao"
          element={
            <RequireAuth roles={['avaliador', 'coordenador_comite', 'admin']}>
              <AnnotationPage />
            </RequireAuth>
          }
        />
        <Route
          path="/gate"
          element={
            <RequireAuth roles={['coordenador_comite', 'admin', 'owner_ferramenta']}>
              <GatePage />
            </RequireAuth>
          }
        />
        <Route path="/indicadores" element={<IndicatorsPage />} />
        <Route
          path="/auditoria"
          element={
            <RequireAuth roles={['auditor_dpo', 'coordenador_comite', 'admin']}>
              <AuditPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth roles={['admin', 'coordenador_comite']}>
              <AdminPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/painel" replace />} />
      </Route>
    </Routes>
  );
}
