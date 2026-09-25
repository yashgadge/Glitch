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
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 overflow-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-[#0a0a0a] to-[#0a0a0a] opacity-60 pointer-events-none"></div>
      <div className="text-center space-y-4 z-10">
        <h1 className="text-5xl md:text-7xl font-bebas tracking-widest text-white">
          EVENT <span className="text-red-500">POSTPONED</span>
        </h1>
        <p className="text-lg md:text-xl font-inter text-gray-400 max-w-2xl mx-auto">
          Due to upcoming university exams, GLITCH 36 has been temporarily postponed. 
          <br/>
          Stay tuned for further updates and new dates.
        </p>
      </div>
    </div>
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
