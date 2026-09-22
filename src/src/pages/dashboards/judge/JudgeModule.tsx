import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/layout/dashboard/DashboardLayout';
import { Home, Users, Bell, User } from 'lucide-react';
import type { NavItem } from '../../../components/layout/dashboard/Sidebar';

const JudgeHome = React.lazy(() => import('./JudgeHome'));
const JudgeTeams = React.lazy(() => import('./JudgeTeams'));
const JudgeEvaluation = React.lazy(() => import('./JudgeEvaluation'));
const JudgeAnnouncements = React.lazy(() => import('./JudgeAnnouncements'));
const JudgeProfile = React.lazy(() => import('./JudgeProfile'));

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[400px]">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const judgeNavItems: NavItem[] = [
  { label: 'Overview', href: '/workspace', icon: Home },
  { label: 'Teams', href: '/workspace/teams', icon: Users },
  { label: 'Announcements', href: '/workspace/announcements', icon: Bell },
  { label: 'Profile', href: '/workspace/profile', icon: User },
];

export default function JudgeModule() {
  return (
    <DashboardLayout navItems={judgeNavItems} pageTitle="JUDGE OPERATIONS">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<JudgeHome />} />
          <Route path="/teams" element={<JudgeTeams />} />
          <Route path="/teams/:teamId" element={<JudgeEvaluation />} />
          <Route path="/announcements" element={<JudgeAnnouncements />} />
          <Route path="/profile" element={<JudgeProfile />} />
          
          <Route path="*" element={<Navigate to="/workspace" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}
