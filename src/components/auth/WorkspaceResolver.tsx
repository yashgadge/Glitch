import React, { Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const AdminModule = React.lazy(() => import('../../pages/dashboards/admin/AdminModule'));
const JudgeModule = React.lazy(() => import('../../pages/dashboards/judge/JudgeModule'));
const VolunteerModule = React.lazy(() => import('../../pages/dashboards/volunteer/VolunteerModule'));
const WorkspaceSelector = React.lazy(() => import('./WorkspaceSelector'));

const LoadingFallback = () => (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export default function WorkspaceResolver() {
  const { user, activeRole, availableRoles, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  // If not authenticated, kick them back
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If they have multiple roles but haven't selected one yet
  if (availableRoles.length > 1 && !activeRole) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <WorkspaceSelector />
      </Suspense>
    );
  }

  // If they somehow have 0 roles and activeRole is null (shouldn't happen with proper guards, but fallback)
  if (!activeRole) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bebas text-red-500 mb-2">ACCESS RESTRICTED</h1>
          <p className="text-gray-400 font-inter text-sm">You do not have clearance for any operational workspaces.</p>
        </div>
      </div>
    );
  }

  // Participants have their own dashboard route, they shouldn't be here.
  // Or we could let them use WorkspaceResolver too, but the plan was Participant -> /dashboard.
  if (activeRole === 'participant') {
    return <Navigate to="/dashboard" replace />;
  }

  let WorkspaceComponent;

  switch (activeRole) {
    case 'super_admin':
    case 'organizer':
      WorkspaceComponent = AdminModule;
      break;
    case 'judge':
    case 'mentor':
      WorkspaceComponent = JudgeModule;
      break;
    case 'volunteer':
      WorkspaceComponent = VolunteerModule;
      break;
    default:
      // Unknown role or unauthorized
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-3xl font-bebas text-red-500 mb-2">ACCESS RESTRICTED</h1>
            <p className="text-gray-400 font-inter text-sm">You do not have clearance for any operational workspaces.</p>
          </div>
        </div>
      );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <WorkspaceComponent />
    </Suspense>
  );
}
