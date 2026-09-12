import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';

import ParticipantHome from './ParticipantHome';
import ParticipantPass from './ParticipantPass';
import ParticipantTeam from './ParticipantTeam';
import ParticipantSubmission from './ParticipantSubmission';
import ParticipantSchedule from './ParticipantSchedule';
import ParticipantResults from './ParticipantResults';
import ParticipantAnnouncements from './ParticipantAnnouncements';
import ParticipantResources from './ParticipantResources';
import ParticipantCertificates from './ParticipantCertificates';
import ParticipantOrders from './ParticipantOrders';
import ParticipantProfile from './ParticipantProfile';
import ParticipantTracks from './ParticipantTracks';

export function ParticipantModule() {
  return (
    <DashboardLayout title="HACKER DASHBOARD">
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
          <Route path="/orders" element={<ParticipantOrders />} />
          <Route path="/profile" element={<ParticipantProfile />} />
          <Route path="/tracks" element={<ParticipantTracks />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    </DashboardLayout>
  );
}

export default ParticipantModule;
