import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Home, ScanLine, Search, LayoutGrid, Bell, User } from 'lucide-react';

import { AuthProvider } from './contexts/AuthContext';
import RoleGuard from './components/RoleGuard';
import { DashboardLayout } from './components/layout/DashboardLayout';
import type { NavItem } from './components/layout/Sidebar';

import Login from './pages/Login';

// Lazy loaded dashboard components
const VolunteerHome = React.lazy(() => import('./pages/dashboard/VolunteerHome'));
const VolunteerScanner = React.lazy(() => import('./pages/dashboard/VolunteerScanner'));
const VolunteerSearch = React.lazy(() => import('./pages/dashboard/VolunteerSearch'));
const VolunteerClassroom = React.lazy(() => import('./pages/dashboard/VolunteerClassroom'));
const VolunteerAnnouncements = React.lazy(() => import('./pages/dashboard/VolunteerAnnouncements'));
const VolunteerProfile = React.lazy(() => import('./pages/dashboard/VolunteerProfile'));

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[400px]">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const volunteerNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'QR Scanner', href: '/dashboard/scanner', icon: ScanLine },
  { label: 'Participant Search', href: '/dashboard/search', icon: Search },
  { label: 'Classroom', href: '/dashboard/classroom', icon: LayoutGrid },
  { label: 'Announcements', href: '/dashboard/announcements', icon: Bell },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
];

function DashboardRoutes() {
  return (
    <DashboardLayout navItems={volunteerNavItems} pageTitle="FIELD OPERATIONS">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<VolunteerHome />} />
          <Route path="/scanner" element={<VolunteerScanner />} />
          <Route path="/search" element={<VolunteerSearch />} />
          <Route path="/classroom" element={<VolunteerClassroom />} />
          <Route path="/announcements" element={<VolunteerAnnouncements />} />
          <Route path="/profile" element={<VolunteerProfile />} />
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard/*" 
          element={
            <RoleGuard>
              <DashboardRoutes />
            </RoleGuard>
          } 
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
