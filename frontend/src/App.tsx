/*
 * Definição de rotas da aplicação. Cada feature é uma pasta em src/features/.
 * Rotas protegidas por sessão OIDC e, quando aplicável, por papéis (RBAC).
 */

import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { CallbackScreen } from './features/auth/CallbackScreen';
import { PainelPage } from './features/painel/PainelPage';
import { CatalogPage } from './features/catalog/CatalogPage';
import { ToolDetailPage } from './features/toolDetail/ToolDetailPage';
import { ToolVersionsPage } from './features/toolVersions/ToolVersionsPage';
import { GoldenDatasetsPage } from './features/goldenDatasets/GoldenDatasetsPage';
import { EvaluationsPage } from './features/evaluations/EvaluationsPage';
import { AnnotationPage } from './features/annotation/AnnotationPage';
import { GatePage } from './features/gate/GatePage';
import { IndicatorsPage } from './features/indicators/IndicatorsPage';
import { AuditPage } from './features/audit/AuditPage';
import { AdminPage } from './features/admin/AdminPage';

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
