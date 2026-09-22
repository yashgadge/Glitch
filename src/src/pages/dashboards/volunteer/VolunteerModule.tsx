import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/layout/dashboard/DashboardLayout';
import { Home, ScanLine, Search, LayoutGrid, Bell, User } from 'lucide-react';
import type { NavItem } from '../../../components/layout/dashboard/Sidebar';

const VolunteerHome = React.lazy(() => import('./VolunteerHome'));
const VolunteerScanner = React.lazy(() => import('./VolunteerScanner'));
const VolunteerSearch = React.lazy(() => import('./VolunteerSearch'));
const VolunteerClassroom = React.lazy(() => import('./VolunteerClassroom'));
const VolunteerAnnouncements = React.lazy(() => import('./VolunteerAnnouncements'));
const VolunteerProfile = React.lazy(() => import('./VolunteerProfile'));

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[400px]">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const volunteerNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/workspace', icon: Home },
  { label: 'QR Scanner', href: '/workspace/scanner', icon: ScanLine },
  { label: 'Participant Search', href: '/workspace/search', icon: Search },
  { label: 'Classroom', href: '/workspace/classroom', icon: LayoutGrid },
  { label: 'Announcements', href: '/workspace/announcements', icon: Bell },
  { label: 'Profile', href: '/workspace/profile', icon: User },
];

export default function VolunteerModule() {
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
          
          <Route path="*" element={<Navigate to="/workspace" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}
