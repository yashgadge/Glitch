import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/layout/dashboard/DashboardLayout';
import { MapPin, Users, CheckSquare } from 'lucide-react';
import type { NavItem } from '../../../components/layout/dashboard/Sidebar';

import CoordinatorHome from './CoordinatorHome';
import TracksViewer from '../shared/TracksViewer';

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[400px]">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);
const navItems: NavItem[] = [
  { label: 'My Classroom', href: '/workspace', icon: MapPin },
  { label: 'Tracks', href: '/workspace/tracks', icon: MapPin },
];

export default function CoordinatorModule() {
  return (
    <DashboardLayout navItems={navItems} pageTitle="Class Coordinator">
      <Routes>
        <Route path="/" element={<CoordinatorHome />} />
        <Route path="/tracks" element={<TracksViewer />} />
        <Route path="*" element={<Navigate to="/workspace" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
