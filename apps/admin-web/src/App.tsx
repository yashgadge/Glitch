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
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 overflow-hidden">
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0a0a0a] to-[#0a0a0a] opacity-60 pointer-events-none"></div>
          <div className="text-center space-y-4 z-10">
            <h1 className="text-5xl md:text-7xl font-bebas tracking-widest text-white">
              ADMIN <span className="text-blue-500">STOPPED</span>
            </h1>
            <p className="text-lg md:text-xl font-inter text-gray-400 max-w-2xl mx-auto">
              The admin panel is currently stopped.
              <br/><br/>
              <span className="text-white font-semibold">How to restart:</span><br/>
              Tell your AI Assistant: "resume the event" to automatically restore both the Participant and Admin websites.
            </p>
          </div>
        </div>
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
