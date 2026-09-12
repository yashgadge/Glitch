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
  Code2,
  ShoppingCart,
  Calendar,
  Users2,
  Package
} from 'lucide-react';
import type { NavItem } from '../../../components/layout/dashboard/Sidebar';

// Sprint 1
import AdminHome from './AdminHome';
import EventSettings from './EventSettings';
import RoundManager from './RoundManager';
import RoundDetails from './RoundDetails';
import StaffManagement from './StaffManagement';
import AssignmentCenter from './AssignmentCenter';
import Permissions from './Permissions';
import TrackManager from './TrackManager';

// Sprint 2
import ParticipantImport from './ParticipantImport';
import Participants from './Participants';
import ParticipantWorkspace from './ParticipantWorkspace';
import TeamManager from './TeamManager';
import ClassroomManager from './ClassroomManager';

// Sprint 3
import CommandCenter from './CommandCenter';
import EvaluationManager from './EvaluationManager';
import ResultsManager from './ResultsManager';
import DigitalPassManager from './DigitalPassManager';
import Communications from './Communications';
import CMSManager from './CMSManager';
import Certificates from './Certificates';
import AuditLog from './AuditLog';
import SubmissionSettings from './SubmissionSettings';
import SubmissionManager from './SubmissionManager';
import OrderManager from './OrderManager';
import AdminRedemptionDashboard from './AdminRedemptionDashboard';
import ProductCatalog from './ProductCatalog';

// Stub out remaining components for subsequent sprints so we don't break routing

// Stub out remaining components for subsequent sprints so we don't break routing


const adminNavItems: NavItem[] = [
  { label: 'Home', href: '/workspace', icon: Home },
  { label: 'Event', href: '/workspace/event', icon: Settings },
  { label: 'Tracks & Problems', href: '/workspace/tracks', icon: CheckSquare },
  { label: 'Rounds', href: '/workspace/rounds', icon: Calendar },
  { label: 'Participants', href: '/workspace/participants', icon: Users },
  { label: 'Teams', href: '/workspace/teams', icon: Users },
  { label: 'Staff', href: '/workspace/staff', icon: UserPlus },
  { label: 'Assignments', href: '/workspace/assignments', icon: Users2 },
  { label: 'Orders', href: '/workspace/orders', icon: ShoppingCart },
  { label: 'Products', href: '/workspace/products', icon: Package },
  { label: 'Redemptions', href: '/workspace/redemptions', icon: Package },
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
        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="/event" element={<EventSettings />} />
          <Route path="/tracks" element={<TrackManager />} />
          <Route path="/rounds" element={<RoundManager />} />
          <Route path="/rounds/:id" element={<RoundDetails />} />
          <Route path="/participants" element={<Participants />} />
          <Route path="/participants/:id" element={<ParticipantWorkspace />} />
          <Route path="/teams" element={<TeamManager />} />
          <Route path="/staff" element={<StaffManagement />} />
          <Route path="/assignments" element={<AssignmentCenter />} />
          <Route path="/orders" element={<OrderManager />} />
          <Route path="/products" element={<ProductCatalog />} />
          <Route path="/redemptions" element={<AdminRedemptionDashboard />} />
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
    </DashboardLayout>
  );
}

