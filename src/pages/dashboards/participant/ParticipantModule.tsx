import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';

const ParticipantHome = React.lazy(() => import('./ParticipantHome'));
const ParticipantPass = React.lazy(() => import('./ParticipantPass'));
const ParticipantTeam = React.lazy(() => import('./ParticipantTeam'));
const ParticipantSubmission = React.lazy(() => import('./ParticipantSubmission'));
const ParticipantSchedule = React.lazy(() => import('./ParticipantSchedule'));
const ParticipantResults = React.lazy(() => import('./ParticipantResults'));
const ParticipantAnnouncements = React.lazy(() => import('./ParticipantAnnouncements'));
const ParticipantResources = React.lazy(() => import('./ParticipantResources'));
const ParticipantCertificates = React.lazy(() => import('./ParticipantCertificates'));
const ParticipantProfile = React.lazy(() => import('./ParticipantProfile'));

export function ParticipantModule() {
  return (
    <DashboardLayout title="HACKER DASHBOARD">
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<ParticipantHome />} />
          <Route path="/pass" element={<ParticipantPass />} />
          <Route path="/team" element={<ParticipantTeam />} />
          <Route path="/submission" element={<ParticipantSubmission />} />
          <Route path="/schedule" element={<ParticipantSchedule />} />
          <Route path="/results" element={<ParticipantResults />} />
          <Route path="/announcements" element={<ParticipantAnnouncements />} />
          <Route path="/resources" element={<ParticipantResources />} />
          <Route path="/certificates" element={<ParticipantCertificates />} />
          <Route path="/profile" element={<ParticipantProfile />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}

export default ParticipantModule;
