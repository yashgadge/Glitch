import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/layout/dashboard/DashboardLayout';
import { 
  Home, 
  Settings, 
  Users, 
  UserPlus, 
  FileUp, 
  School, 
  TerminalSquare, 
  CheckSquare, 
  Trophy, 
  QrCode, 
  GitMerge, 
  MessageSquare, 
  Globe, 
  Award, 
  ShieldAlert, 
  Activity,
  Code2
} from 'lucide-react';
import type { NavItem } from '../../../components/layout/dashboard/Sidebar';

// Sprint 1
const AdminHome = React.lazy(() => import('./AdminHome'));
const EventSettings = React.lazy(() => import('./EventSettings'));
const StaffManagement = React.lazy(() => import('./StaffManagement'));
const Permissions = React.lazy(() => import('./Permissions'));

// Sprint 2
const ParticipantImport = React.lazy(() => import('./ParticipantImport'));
const Participants = React.lazy(() => import('./Participants'));
const ParticipantWorkspace = React.lazy(() => import('./ParticipantWorkspace'));
const TeamManager = React.lazy(() => import('./TeamManager'));
const ClassroomManager = React.lazy(() => import('./ClassroomManager'));

// Sprint 3
const CommandCenter = React.lazy(() => import('./CommandCenter'));
const EvaluationManager = React.lazy(() => import('./EvaluationManager'));
const ResultsManager = React.lazy(() => import('./ResultsManager'));
const DigitalPassManager = React.lazy(() => import('./DigitalPassManager'));
const Communications = React.lazy(() => import('./Communications'));
const CMSManager = React.lazy(() => import('./CMSManager'));
const Certificates = React.lazy(() => import('./Certificates'));
const AuditLog = React.lazy(() => import('./AuditLog'));
const SubmissionSettings = React.lazy(() => import('./SubmissionSettings'));
const SubmissionManager = React.lazy(() => import('./SubmissionManager'));

// Stub out remaining components for subsequent sprints so we don't break routing

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[400px]">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const adminNavItems: NavItem[] = [
  { label: 'Home', href: '/workspace', icon: Home },
  { label: 'Event', href: '/workspace/event', icon: Settings },
  { label: 'Participants', href: '/workspace/participants', icon: Users },
  { label: 'Teams', href: '/workspace/teams', icon: Users },
  { label: 'Staff', href: '/workspace/staff', icon: UserPlus },
  { label: 'Registration Import', href: '/workspace/import', icon: FileUp },
  { label: 'Classrooms', href: '/workspace/classrooms', icon: School },
  { label: 'Command Center', href: '/workspace/command-center', icon: TerminalSquare },
  { label: 'Evaluation', href: '/workspace/evaluation', icon: CheckSquare },
  { label: 'Results', href: '/workspace/results', icon: Trophy },
  { label: 'Digital Pass', href: '/workspace/digital-pass', icon: QrCode },
  { label: 'Submissions', href: '/workspace/submissions', icon: Code2 },
  { label: 'Sub. Settings', href: '/workspace/engine', icon: Settings },
  { label: 'Communication', href: '/workspace/communication', icon: MessageSquare },
  { label: 'Website CMS', href: '/workspace/cms', icon: Globe },
  { label: 'Certificates', href: '/workspace/certificates', icon: Award },
  { label: 'Permissions', href: '/workspace/permissions', icon: ShieldAlert },
  { label: 'Activity Log', href: '/workspace/activity', icon: Activity },
];

export default function AdminModule() {
  return (
    <DashboardLayout navItems={adminNavItems} pageTitle="Command Center">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="/event" element={<EventSettings />} />
          <Route path="/participants" element={<Participants />} />
          <Route path="/participants/:id" element={<ParticipantWorkspace />} />
          <Route path="/teams" element={<TeamManager />} />
          <Route path="/staff" element={<StaffManagement />} />
          <Route path="/import" element={<ParticipantImport />} />
          <Route path="/classrooms" element={<ClassroomManager />} />
          <Route path="/command-center" element={<CommandCenter />} />
          <Route path="/evaluation" element={<EvaluationManager />} />
          <Route path="/results" element={<ResultsManager />} />
          <Route path="/digital-pass" element={<DigitalPassManager />} />
          <Route path="/submissions" element={<SubmissionManager />} />
          <Route path="/engine" element={<SubmissionSettings />} />
          <Route path="/communication" element={<Communications />} />
          <Route path="/cms" element={<CMSManager />} />
          <Route path="/certificates" element={<Certificates />} />
          <Route path="/permissions" element={<Permissions />} />
          <Route path="/activity" element={<AuditLog />} />
          
          <Route path="*" element={<Navigate to="/workspace" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}
