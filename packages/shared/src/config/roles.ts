import { 
  LayoutDashboard, Users, ClipboardList, BookOpen, 
  Settings, UserCheck, Megaphone, FileCheck,
  Award, Code2, QrCode, MessageCircle,
  Shield, Calendar, FileText, UploadCloud, FileSpreadsheet, PlayCircle, Network,
  CheckCircle2, MapPin, ShieldCheck, ShoppingCart
} from 'lucide-react';

export interface SidebarItem {
  title: string;
  path: string;
  icon: any;
  permissions?: string[];
}

export interface RoleConfiguration {
  defaultRoute: string;
  permissions: string[];
  sidebar: SidebarItem[];
}

export const ROLE_CONFIG: Record<string, RoleConfiguration> = {
  super_admin: {
    defaultRoute: '/workspace',
    permissions: ['*'],
    sidebar: [
      { title: 'Command Center', path: '/workspace', icon: LayoutDashboard },
      { title: 'Devnovate Import', path: '/workspace/import', icon: UploadCloud },
      { title: 'Staff Management', path: '/workspace/staff', icon: ShieldCheck },
      { title: 'Permissions', path: '/workspace/permissions', icon: UserCheck },
      { title: 'All Participants', path: '/workspace/participants', icon: Users },
      { title: 'All Teams', path: '/workspace/teams', icon: Users },
      { title: 'Audit Log', path: '/workspace/audit', icon: FileText },
      { title: 'Profile', path: '/workspace/profile', icon: UserCheck },
    ]
  },
  organizer: {
    defaultRoute: '/workspace',
    permissions: [
      'participants.read', 'participants.manage',
      'teams.read', 'teams.manage',
      'judges.read', 'judges.assign',
      'volunteers.read', 'volunteers.manage',
      'announcements.create',
      'analytics.view',
      'certificates.issue',
      'settings.manage',
      'schedule.manage',
      'qr.manage',
      'audit.view',
      'permissions.manage',
      'tasks.manage',
      'team.advance',
      'team.hold',
      'team.disqualify',
      'team.eliminate',
      'pass.revoke'
    ],
    sidebar: [
      { title: 'Dashboard', path: '/workspace', icon: LayoutDashboard },
      { title: 'Live Event Mode', path: '/workspace/live', icon: PlayCircle },
      { title: 'Devnovate Import', path: '/workspace/import', icon: UploadCloud },
      { title: 'Participants', path: '/workspace/participants', icon: Users },
      { title: 'Teams', path: '/workspace/teams', icon: Users },
      { title: 'Submissions', path: '/workspace/submissions', icon: Code2 },
      { title: 'Announcements', path: '/workspace/announcements', icon: Megaphone },
      { title: 'Approvals', path: '/workspace/approvals', icon: CheckCircle2 },
      { title: 'Shifts', path: '/workspace/shifts', icon: Calendar },
      { title: 'Rooms', path: '/workspace/rooms', icon: MapPin },
      { title: 'Schedule', path: '/workspace/schedule', icon: Calendar },
      { title: 'Event Engine', path: '/workspace/engine', icon: Settings },
      { title: 'Resources', path: '/workspace/resources', icon: UploadCloud },
      { title: 'Staff', path: '/workspace/staff', icon: Shield },
      { title: 'Permissions', path: '/workspace/permissions', icon: UserCheck },
      { title: 'QR Operations', path: '/workspace/qr', icon: QrCode },
      { title: 'Reports', path: '/workspace/reports', icon: FileSpreadsheet },
      { title: 'Certificates', path: '/workspace/certificates', icon: Award },
      { title: 'Audit Log', path: '/workspace/audit', icon: FileText },
    ]
  },
  judge: {
    defaultRoute: '/workspace',
    permissions: [
      'evaluations.view',
      'evaluations.submit',
      'schedule.view',
      'announcements.view'
    ],
    sidebar: [
      { title: 'Dashboard', path: '/workspace', icon: LayoutDashboard },
      { title: 'Classroom Teams', path: '/workspace/evaluations', icon: Users },
      { title: 'Schedule', path: '/workspace/schedule', icon: Calendar },
      { title: 'Tracks & Problems', path: '/workspace/tracks', icon: CheckCircle2 },
      { title: 'History', path: '/workspace/history', icon: FileCheck },
    ]
  },
  volunteer: {
    defaultRoute: '/workspace',
    permissions: [
      'qr.scan',
      'team.eliminate',
      'team.advance',
      'team.hold',
      'team.disqualify',
      'pass.revoke',
      'attendance.verify',
      'meals.verify',
      'swag.verify',
      'announcements.view',
      'schedule.view',
      'participant.search',
      'incident.create',
      'incident.view',
      'profile.edit'
    ],
    sidebar: [
      { title: 'Dashboard', path: '/workspace', icon: LayoutDashboard },
      { title: 'QR Scanner', path: '/workspace/scanner', icon: QrCode },
      { title: 'Tasks', path: '/workspace/tasks', icon: ClipboardList },
      { title: 'Incident Report', path: '/workspace/incidents', icon: Shield },
      { title: 'Participant Search', path: '/workspace/search', icon: Users },
      { title: 'Venue Map', path: '/workspace/map', icon: MapPin },
      { title: 'Tracks & Problems', path: '/workspace/tracks', icon: CheckCircle2 },
      { title: 'Profile', path: '/workspace/profile', icon: Settings },
    ]
  },
  mentor: {
    defaultRoute: '/workspace',
    permissions: [
      'mentoring.notes.create',
      'schedule.view',
      'announcements.view'
    ],
    sidebar: [
      { title: 'Dashboard', path: '/workspace', icon: LayoutDashboard },
      { title: 'Classroom Teams', path: '/workspace/teams', icon: Users },
      { title: 'Schedule', path: '/workspace/schedule', icon: Calendar },
      { title: 'Tracks & Problems', path: '/workspace/tracks', icon: CheckCircle2 },
      { title: 'Session Logs', path: '/workspace/sessions', icon: MessageCircle },
    ]
  },
  participant: {
    defaultRoute: '/dashboard',
    permissions: [
      'profile.manage',
      'team.create',
      'team.join',
      'submissions.create'
    ],
    sidebar: [
      { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { title: 'Digital Pass', path: '/dashboard/pass', icon: QrCode },
      { title: 'Team', path: '/dashboard/team', icon: Users },
      { title: 'Tracks & Problems', path: '/dashboard/tracks', icon: CheckCircle2 },
      { title: 'Submission', path: '/dashboard/submission', icon: Code2 },
      { title: 'Schedule', path: '/dashboard/schedule', icon: Calendar },
      { title: 'Results', path: '/dashboard/results', icon: Award },
      { title: 'Announcements', path: '/dashboard/announcements', icon: Megaphone },
      { title: 'Resources', path: '/dashboard/resources', icon: BookOpen },
      { title: 'Certificates', path: '/dashboard/certificates', icon: FileCheck },
      { title: 'Add-ons & Food', path: '/dashboard/orders', icon: ShoppingCart },
      { title: 'Profile', path: '/dashboard/profile', icon: Settings },
    ]
  }
};
