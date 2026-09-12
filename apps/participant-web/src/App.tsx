import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRoute from './components/auth/RoleRoute';
import ProfileGuard from './components/auth/ProfileGuard';
import MaintenanceGuard from './components/auth/MaintenanceGuard';
import { Agentation } from 'agentation';

// Helper to catch chunk load errors and force a refresh to get the new assets
const lazyRetry = (componentImport: () => Promise<any>) => {
  return new Promise<any>((resolve, reject) => {
    componentImport()
      .then(resolve)
      .catch((error) => {
        const isChunkLoadError = error?.name === 'TypeError' || error?.message?.includes('dynamically imported module') || error?.message?.includes('fetch');
        const hasRefreshed = sessionStorage.getItem('chunk-load-error-refreshed');
        
        if (isChunkLoadError && !hasRefreshed) {
          sessionStorage.setItem('chunk-load-error-refreshed', 'true');
          window.location.reload();
        } else {
          reject(error);
        }
      });
  });
};

// Lazy loaded public modules
const Login = React.lazy(() => lazyRetry(() => import('./pages/auth/Login')));
const RegistrationWizard = React.lazy(() => lazyRetry(() => import('./pages/auth/RegistrationWizard')));
const ForgotPassword = React.lazy(() => lazyRetry(() => import('./pages/auth/ForgotPassword')));
const ForcePasswordChange = React.lazy(() => lazyRetry(() => import('./pages/auth/ForcePasswordChange')));
const CertificateVerification = React.lazy(() => lazyRetry(() => import('./pages/public/CertificateVerification')));
const LazyParticipant = React.lazy(() => lazyRetry(() => import('./pages/dashboards/participant/ParticipantModule')));

// New Public Pages
import PublicLayout from './components/layout/PublicLayout';
const RegistrationFeesPage = React.lazy(() => lazyRetry(() => import('./pages/public/RegistrationFeesPage')));
const CompetitionRules = React.lazy(() => lazyRetry(() => import('./pages/public/CompetitionRules')));
const TermsAndConditions = React.lazy(() => lazyRetry(() => import('./pages/public/TermsAndConditions')));
const PrivacyPolicy = React.lazy(() => lazyRetry(() => import('./pages/public/PrivacyPolicy')));
const RefundPolicy = React.lazy(() => lazyRetry(() => import('./pages/public/RefundPolicy')));
const ContactPage = React.lazy(() => lazyRetry(() => import('./pages/public/ContactPage')));
const EventDetails = React.lazy(() => lazyRetry(() => import('./pages/public/EventDetails')));

import { LoadingScreen as LoadingFallback } from './components/ui/LoadingScreen';

class DevToolBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? null : this.props.children; }
}

const AppContent = () => {
  React.useEffect(() => {
    sessionStorage.removeItem('chunk-load-error-refreshed');
  }, []);

  return (
    <Routes>
      {/* Public Routes guarded by Maintenance Mode */}
      <Route element={<MaintenanceGuard />}>
        {/* Landing Page Route - Keeps its own smooth scroll structure */}
        <Route path="/" element={<LandingPage />} />
        
        {/* New Public Layout Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/event" element={<EventDetails />} />
          <Route path="/registration-fees" element={<RegistrationFeesPage />} />
          <Route path="/competition-rules" element={<CompetitionRules />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/verify/:id" element={<CertificateVerification />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Registration Route */}
        <Route path="/register" element={<RegistrationWizard />} />
        
        {/* Participant Routes */}
        <Route path="/force-password-change" element={<ProtectedRoute><ForcePasswordChange /></ProtectedRoute>} />
        <Route path="/dashboard/*" element={<RoleRoute allowedRoles={['participant']}><ProfileGuard><LazyParticipant /></ProfileGuard></RoleRoute>} />
        <Route path="/workspace/*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <AppContent />
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
