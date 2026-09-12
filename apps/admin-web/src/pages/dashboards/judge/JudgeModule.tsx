import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/layout/dashboard/DashboardLayout';
import { Home, Users, Bell, User, BookOpen, CheckSquare } from 'lucide-react';
import type { NavItem } from '../../../components/layout/dashboard/Sidebar';

import JudgeHome from './JudgeHome';
import JudgeTeams from './JudgeTeams';
import JudgeEvaluation from './JudgeEvaluation';
import JudgeEvaluationsList from './JudgeEvaluationsList';
import JudgeAnnouncements from './JudgeAnnouncements';
import JudgeProfile from './JudgeProfile';
import JudgeTracks from './JudgeTracks';
import LiveJudgingDashboard from './LiveJudgingDashboard';

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[400px]">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const judgeNavItems: NavItem[] = [
  { label: 'Overview', href: '/workspace', icon: Home, end: true },
  { label: 'My Teams', href: '/workspace/teams', icon: Users },
  { label: 'Evaluations', href: '/workspace/evaluations', icon: CheckSquare },
  { label: 'Live Judging', href: '/workspace/live', icon: CheckSquare },
  { label: 'Tracks', href: '/workspace/tracks', icon: BookOpen },
  { label: 'Announcements', href: '/workspace/announcements', icon: Bell },
  { label: 'Profile', href: '/workspace/profile', icon: User },
];

export default function JudgeModule() {
  return (
    <DashboardLayout navItems={judgeNavItems} pageTitle="JUDGE OPERATIONS">
        <Routes>
          <Route path="/" element={<JudgeHome />} />
          <Route path="/teams" element={<JudgeTeams />} />
          <Route path="/teams/:teamId" element={<JudgeEvaluation />} />
          <Route path="/evaluations" element={<JudgeEvaluationsList />} />
          <Route path="/live" element={<LiveJudgingDashboard />} />
          <Route path="/announcements" element={<JudgeAnnouncements />} />
          <Route path="/profile" element={<JudgeProfile />} />
          <Route path="/tracks" element={<JudgeTracks />} />
          <Route path="*" element={<Navigate to="/workspace" replace />} />
        </Routes>
    </DashboardLayout>
  );
}
