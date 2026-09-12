import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRoute from './components/auth/RoleRoute';
import ProfileGuard from './components/auth/ProfileGuard';
import MaintenanceGuard from './components/auth/MaintenanceGuard';
import { Agentation } from 'agentation';

import { Navigate } from 'react-router-dom';

// Lazy loaded public modules
const Login = React.lazy(() => import('./pages/auth/Login'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const ForcePasswordChange = React.lazy(() => import('./pages/auth/ForcePasswordChange'));

// Internal Gateway
const WorkspaceResolver = React.lazy(() => import('./components/auth/WorkspaceResolver'));

import { LoadingScreen as LoadingFallback } from './components/ui/LoadingScreen';

class DevToolBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? null : this.props.children; }
}

function App() {
  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Routes guarded by Maintenance Mode */}
          <Route element={<MaintenanceGuard />}>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/force-password-change" element={<ProtectedRoute><ForcePasswordChange /></ProtectedRoute>} />
          </Route>
          
          {/* Internal Access Gateway - All Staff Roles resolve through here */}
          <Route path="/workspace/*" element={
            <ProtectedRoute>
              <ProfileGuard>
                <WorkspaceResolver />
              </ProfileGuard>
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>
      
      {/* Dev Tools - Stripped in Production */}
      {import.meta.env.DEV && window.innerWidth > 768 && (
        <Suspense fallback={null}>
          <Agentation endpoint={`http://${window.location.hostname}:4747`} />
        </Suspense>
      )}
    </>
  );
}

export default App;
