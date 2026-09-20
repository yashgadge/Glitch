import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'volunteer') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-secondary p-8 rounded-xl max-w-md w-full text-center border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-400 mb-6">
            You do not have the required permissions to access the Volunteer Dashboard.
          </p>
          <button 
            onClick={() => window.location.href = 'https://glitch-36.web.app'}
            className="w-full bg-primary text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Return to Participant Portal
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
