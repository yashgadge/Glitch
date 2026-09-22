import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileGuardProps {
  children: React.ReactNode;
}

export default function ProfileGuard({ children }: ProfileGuardProps) {
  const { user, mustChangePassword, loading } = useAuth();

  if (loading) return null;

  if (user && mustChangePassword) {
    return <Navigate to="/force-password-change" replace />;
  }



  return <>{children}</>;
}
