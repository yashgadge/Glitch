export type Role = 'super_admin' | 'organizer' | 'judge' | 'mentor' | 'volunteer' | 'participant';

export type ParticipantStatus = 'pending_activation' | 'imported' | 'temp_pass_issued' | 'profile_incomplete' | 'ready_for_checkin' | 'checked_in' | 'disqualified' | 'eliminated' | 'completed' | 'withdrawn' | 'suspended';

export interface Participant {
  id: string; // Auth UID
  glitchId: string; // GL26-P-00000X
  registrationId?: string; // DEV-48291
  name: string;
  email: string;
  mobile?: string;
  phone?: string;
  college?: string;
  track?: string;
  internalNotes?: string;
  teamId?: string;
  digitalPassId?: string;
  qrToken?: string;
  qrCreatedAt?: string;
  qrVersion?: number;
  role: 'participant';
  mustChangePassword?: boolean;
  profileCompleted: boolean;
  status?: ParticipantStatus | string;
  checkedIn?: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  eliminated?: boolean;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Staff {
  id: string; // Auth UID
  name: string;
  email: string;
  role: Role; // Legacy fallback
  roles?: Role[]; // Multi-role support
  customPermissions: string[];
  mustChangePassword?: boolean;
  assignedClassroom?: string; // For Judges/Volunteers
  currentRound?: number; // For Judges
  status?: string; // For Judges
  currentShift?: string; // For Volunteers
  currentZone?: string; // For Volunteers
  createdAt: string;
  updatedAt: string;
}

export type TeamStatus = 'registered' | 'checked_in' | 'qualified' | 'round_1' | 'round_2' | 'round_3' | 'semi_final' | 'final' | 'winner' | 'eliminated' | 'disqualified' | 'held';

export interface Team {
  id: string; // T-0001
  name: string;
  code?: string; // Team Code for import grouping
  memberIds: string[]; // Array of Participant Auth UIDs
  leaderId: string;
  track: string;
  assignedRoom?: string; // Room ID e.g., 'A201'
  assignedSeat?: string; // Seat ID e.g., '01'
  currentRound: number;
  previousRound?: number;
  status: TeamStatus;
  eliminated?: boolean;
  eliminatedAt?: string;
  eliminatedBy?: string;
  eliminationReason?: string;
  disqualified?: boolean;
  disqualifiedBy?: string;
  disqualifiedReason?: string;
  qualified?: boolean;
  checkedIn?: boolean;
  rank?: number;
  finalRank?: number;
  score?: number;
  isWinner?: boolean;
  isFinalist?: boolean;
  lastStatusUpdate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeatingPlanEntry {
  seatId: string; // e.g. '01'
  teamId: string | null;
}

export interface Classroom {
  id: string; // e.g., 'A201'
  roomNumber: string;
  building: string;
  floor: string;
  capacity: number;
  rows?: number;
  columns?: number;
  assignedVolunteers: string[]; // Staff IDs
  assignedMentors: string[]; // Staff IDs
  seatingPlan: SeatingPlanEntry[];
  currentRound: number;
  notes?: string;
  status: 'active' | 'maintenance' | 'offline';
  updatedAt: string;
}

export type SubmissionFieldType = 'text' | 'textarea' | 'url' | 'number' | 'checkbox' | 'select' | 'multiselect';
export type UrlValidationType = 'any' | 'github' | 'youtube' | 'gdrive' | 'figma' | 'devpost' | 'custom';

export interface SubmissionField {
  id: string;
  name: string;
  type: SubmissionFieldType;
  placeholder?: string;
  required: boolean;
  enabled: boolean;
  displayOrder: number;
  description?: string;
  urlValidation?: UrlValidationType;
  customDomain?: string; // used if urlValidation === 'custom'
  maxLength?: number;
  options?: string[]; // Kept for backwards compatibility if needed
  validation?: {
    maxSize?: number;
    allowedTypes?: string[];
    regex?: string;
  };
}

export interface Submission {
  id: string;
  teamId: string;
  roundId: number;
  status: 'draft' | 'submitted' | 'locked' | 'late';
  fields: Record<string, any>; // Dynamic fields
  internalNotes?: string;
  timestamp: string;
  submittedAt?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface EvaluationCriteria {
  id: string;
  name: string;
  maxScore: number;
  score: number;
}

export interface Evaluation {
  id: string; // e.g., evalId
  judgeId: string;
  teamId: string;
  roundId: number;
  submissionId?: string;
  criteriaScores: EvaluationCriteria[];
  totalScore: number;
  feedback: string;
  status: 'draft' | 'submitted' | 'locked';
  locked: boolean;
  version: number;
  timestamp: string;
}

export interface Result {
  id: string; // teamId_roundId
  teamId: string;
  roundId: number;
  criteriaAverages: Record<string, number>;
  roundAverage: number;
  overallAverage: number;
  published: boolean;
  timestamp: string;
}

export interface Ranking {
  id: string;
  roundId: number;
  teamId: string;
  rank: number;
  isTied: boolean;
  qualified: boolean;
  published: boolean;
  timestamp: string;
}

export type PassStatus = 'pending' | 'active' | 'blocked' | 'revoked' | 'expired' | 'lost' | 'reissued' | 'archived';

export interface DigitalPass {
  id: string; // passId
  participantId: string;
  token: string;
  status: PassStatus;
  createdAt: string;
  activatedAt?: string;
  expiresAt?: string;
  lastScannedAt?: string;
  lastScannedBy?: string;
  lastScanPurpose?: string;
  scanCount: number;
  reissueCount: number;
  blockedReason?: string;
  isRevoked: boolean;
  version: number;
}

export interface ScanLog {
  id?: string;
  token: string;
  participantId: string;
  passId: string;
  volunteerId: string;
  scannerUser: string; // Name of scanner
  scannerRole: string; // Role of scanner
  purpose: string; // Registration, Lunch, etc.
  location: string;
  deviceId: string;
  timestamp: string;
  result: 'success' | 'failed' | 'rejected' | 'undo';
  reason?: string; // Reason for failure
  gate?: string;
  networkStatus?: string; // online, offline
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetRoles: Role[];
  priority: 'low' | 'normal' | 'high' | 'critical';
  authorId: string;
  timestamp: string;
}

export interface Resource {
  id: string;
  title: string;
  type: string;
  url: string;
  targetRoles: Role[];
  timestamp: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorRole: Role;
  action: string;
  targetId: string;
  resourceType: string;
  metadata?: any;
  timestamp: string;
}

export interface EventConfig {
  id: 'master';
  activeRoundId: string;
  isRegistrationOpen: boolean;
  isHackathonActive: boolean;
  announcementsEnabled: boolean;
  isSubmissionOpen?: boolean;
  submissionDeadline?: string;
  autoLockAfterDeadline?: boolean;
  allowLateSubmission?: boolean;
  allowSubmissionEditing?: boolean;
  allowEditingAfterSubmission?: boolean;
  updatedAt: string;
}

export interface Round {
  id: string;
  name: string;
  displayName: string;
  order: number;
  status: 'pending' | 'active' | 'completed';
  registrationOpen: boolean;
  submissionOpen: boolean;
  evaluationOpen: boolean;
  resultsPublished: boolean;
  qualifiedCount: number;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationVersion {
  id: string; // e.g. evalId_v1
  evaluationId: string;
  versionNumber: number;
  criteriaScores: EvaluationCriteria[];
  totalScore: number;
  feedback: string;
  submittedBy: string;
  submittedAt: string;
  locked: boolean;
}
