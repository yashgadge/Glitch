import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@shared/contexts/AuthContext';

interface ProfileGuardProps {
  children: React.ReactNode;
}

export default function ProfileGuard({ children }: ProfileGuardProps) {
  const { user, profileData, mustChangePassword, loading } = useAuth();

  if (loading) return null;

  if (user && mustChangePassword) {
    return <Navigate to="/force-password-change" replace />;
  }

  if (user && profileData?.registrationStatus === 'incomplete') {
    return <Navigate to="/register" replace />;
  }



  return <>{children}</>;
}
