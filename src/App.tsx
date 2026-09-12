import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRoute from './components/auth/RoleRoute';
import ProfileGuard from './components/auth/ProfileGuard';
import MaintenanceGuard from './components/auth/MaintenanceGuard';
import { Agentation } from 'agentation';

// Lazy loaded public modules
const Login = React.lazy(() => import('./pages/auth/Login'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const ForcePasswordChange = React.lazy(() => import('./pages/auth/ForcePasswordChange'));
const CertificateVerification = React.lazy(() => import('./pages/public/CertificateVerification'));
// Internal Gateway
const WorkspaceResolver = React.lazy(() => import('./components/auth/WorkspaceResolver'));
const LazyParticipant = React.lazy(() => import('./pages/dashboards/participant/ParticipantModule'));

const LoadingFallback = () => (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

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
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify/:id" element={<CertificateVerification />} />
            
            {/* Participant Routes */}
            <Route path="/force-password-change" element={<ProtectedRoute><ForcePasswordChange /></ProtectedRoute>} />
            <Route path="/dashboard/*" element={<RoleRoute allowedRoles={['participant']}><ProfileGuard><LazyParticipant /></ProfileGuard></RoleRoute>} />
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
