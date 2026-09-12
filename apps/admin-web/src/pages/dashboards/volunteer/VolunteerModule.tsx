import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/layout/dashboard/DashboardLayout';
import { Home, ScanLine, Search, LayoutGrid, Bell, User, Users, Map, Package, History, AlertCircle, Calendar } from 'lucide-react';
import type { NavItem } from '../../../components/layout/dashboard/Sidebar';

import VolunteerHome from './VolunteerHome';
import VolunteerScanner from './VolunteerScanner';
import VolunteerParticipants from './VolunteerParticipants';
import VolunteerTeams from './VolunteerTeams';
import VolunteerAssignment from './VolunteerAssignment';
import VolunteerClassrooms from './VolunteerClassrooms';
import VolunteerAttendance from './VolunteerAttendance';
import VolunteerRedemption from './VolunteerRedemption';
import VolunteerAnnouncements from './VolunteerAnnouncements';
import VolunteerActivity from './VolunteerActivity';
import VolunteerIssues from './VolunteerIssues';
import VolunteerProfile from './VolunteerProfile';
import TracksViewer from '../shared/TracksViewer';

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[400px]">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const volunteerNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/workspace', icon: Home },
  { label: 'QR Scanner', href: '/workspace/scanner', icon: ScanLine },
  { label: 'Participants', href: '/workspace/participants', icon: Search },
  { label: 'Teams', href: '/workspace/teams', icon: Users },
  { label: 'My Assignment', href: '/workspace/assignment', icon: LayoutGrid },
  { label: 'Classrooms', href: '/workspace/classrooms', icon: Map },
  { label: 'Attendance', href: '/workspace/attendance', icon: User },
  { label: 'Redemption', href: '/workspace/redemption', icon: Package },
  { label: 'Announcements', href: '/workspace/announcements', icon: Bell },
  { label: 'Activity', href: '/workspace/activity', icon: History },
  { label: 'Issues / Help', href: '/workspace/issues', icon: AlertCircle },
  { label: 'Profile', href: '/workspace/profile', icon: User },
];

export default function VolunteerModule() {
  return (
    <DashboardLayout navItems={volunteerNavItems} pageTitle="FIELD OPERATIONS">
      <Routes>
        <Route path="/" element={<VolunteerHome />} />
        <Route path="/scanner" element={<VolunteerScanner />} />
        <Route path="/participants" element={<VolunteerParticipants />} />
        <Route path="/teams" element={<VolunteerTeams />} />
        <Route path="/assignments" element={<VolunteerAssignment />} />
        <Route path="/classrooms" element={<VolunteerClassrooms />} />
        <Route path="/attendance" element={<VolunteerAttendance />} />
        <Route path="/redemption" element={<VolunteerRedemption />} />
        <Route path="/announcements" element={<VolunteerAnnouncements />} />
        <Route path="/activity" element={<VolunteerActivity />} />
        <Route path="/issues" element={<VolunteerIssues />} />
        <Route path="/profile" element={<VolunteerProfile />} />
        <Route path="/tracks" element={<TracksViewer />} />
        
        <Route path="*" element={<Navigate to="/workspace" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
