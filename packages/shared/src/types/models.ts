export type Role = 'super_admin' | 'organizer' | 'judge' | 'mentor' | 'volunteer' | 'class_coordinator' | 'participant';

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
  city?: string;
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

export type StaffAvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE' | 'ON_BREAK' | 'OFF_SHIFT';

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
  availabilityStatus?: StaffAvailabilityStatus;
  availabilityReason?: string;
  reservedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export type TeamStatus = 'registered' | 'checked_in' | 'qualified' | 'round_1' | 'round_2' | 'round_3' | 'semi_final' | 'final' | 'winner' | 'eliminated' | 'disqualified' | 'held';
export type PresentationStatus = 'ARRIVED' | 'READY' | 'PRESENTING' | 'COMPLETED' | 'NO_SHOW';

export interface Team {
  id: string; // T-0001
  name: string;
  code?: string; // Team Code for import grouping
  memberIds: string[]; // Array of Participant Auth UIDs
  pendingMemberIds?: string[]; // Users requesting to join
  leaderId: string;
  trackId?: string;
  track: string;
  problemId?: string;
  trackLocked?: boolean;
  assignedRoom?: string; // Room ID e.g., 'A201'
  assignedSeat?: string; // Seat ID e.g., '01'
  currentRound: number;
  previousRound?: number;
  status: TeamStatus;
  presentationStatus?: PresentationStatus;
  paymentStatus?: 'PAYMENT_PENDING' | 'PAYMENT_PROCESSING' | 'PAYMENT_FAILED' | 'PAYMENT_CANCELLED' | 'PAID' | 'REFUNDED';
  registrationStatus?: 'DRAFT' | 'PAYMENT_PENDING' | 'PAYMENT_PROCESSING' | 'CONFIRMED' | 'CANCELLED';
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

export interface Classroom {
  id?: string;
  classroomId: string;
  roomName: string;
  building: string;
  floor: string;
  capacity: number;
  status: 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE';
  assignedCoordinatorIds?: string[];
  assignedStaffIds?: string[];
  teamIds?: string[];
  currentOccupancy?: number;
  currentRound?: number;
  notes?: string;
  primaryCoordinator?: string | null;
  backupCoordinator?: string | null;
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

export interface RoundSubmissionConfig {
  id: string; // usually same as roundId
  roundId: number;
  enabled: boolean;
  submitterRole: 'team_leader' | 'any';
  fallbackSubmitterRole: 'vice_leader' | 'none';
  maxRevisions: number;
  autoLockAfterDeadline: boolean;
  allowLateSubmission: boolean;
  allowDraftEditing: boolean;
  allowEditingAfterSubmission: boolean;
  allowChangeRequests: boolean;
  changeRequestRoles: string[]; // e.g. ['admin', 'judge']
  presentationRequired: boolean;
  maxPdfSizeMB: number;
  updatedAt: string;
}

export interface Submission {
  id: string; // e.g. T-001_1
  teamId: string;
  roundId: number;
  currentVersion: number;
  status: 'not_started' | 'draft' | 'submitted' | 'under_review' | 'changes_requested' | 'revision_available' | 'revision_submitted' | 'evaluated' | 'approved' | 'locked' | 'late' | 'rejected';
  internalNotes?: string;
  timestamp: string;
  updatedAt: string;
}

export interface SubmissionVersion {
  id: string; // e.g. T-001_1_v1
  submissionId: string;
  teamId: string;
  roundId: number;
  versionNumber: number;
  previousVersionId?: string;
  fields: Record<string, any>;
  changeSummary?: string;
  status: 'draft' | 'submitted' | 'locked' | 'late';
  submittedAt?: string;
  submittedByUid?: string;
  submittedByRole?: string;
  lateDuration?: number;
  createdAt: string;
}

export type ChangeRequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ChangeRequestCategory = 'TECHNICAL' | 'UI_UX' | 'PERFORMANCE' | 'SECURITY' | 'DOCUMENTATION' | 'PRESENTATION' | 'FUNCTIONALITY' | 'ARCHITECTURE' | 'DEPLOYMENT' | 'OTHER';
export type ChangeRequestStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IMPLEMENTED' | 'PARTIALLY_IMPLEMENTED' | 'NOT_IMPLEMENTED' | 'REJECTED' | 'CLOSED';

export interface ChangeRequest {
  id: string;
  roundId: number;
  teamId: string;
  submissionId: string;
  versionId: string; // The version this request targets
  category: ChangeRequestCategory;
  title: string;
  description: string;
  priority: ChangeRequestPriority;
  status: ChangeRequestStatus;
  participantExplanation?: string;
  createdByUid: string;
  createdByRole: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedByUid?: string;
}

export interface CriterionTemplate {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  order: number;
  enabled: boolean;
}

export type HelpRequestStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type IssueCategory = 'Submission issue' | 'Demo not working' | 'Rule concern' | 'Possible plagiarism' | 'Missing requirement' | 'Team identity concern' | 'Technical problem' | 'Other';

export interface HelpRequest {
  id: string;
  judgeId: string;
  judgeName: string;
  roundId: number;
  message: string;
  teamId?: string;
  status: HelpRequestStatus;
  adminResponse?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedByUid?: string;
}

export interface JudgeIssue {
  id: string;
  judgeId: string;
  teamId: string;
  roundId: number;
  category: IssueCategory;
  details: string;
  status: HelpRequestStatus;
  adminResponse?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedByUid?: string;
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
  submissionVersionId?: string;
  criteriaScores: EvaluationCriteria[];
  totalScore: number;
  feedback: string;
  status: 'draft' | 'submitted' | 'locked';
  locked: boolean;
  version: number;
  timestamp: string;
}

export interface JudgeAssignment {
  id: string; // e.g., roundId_judgeId_teamId
  roundId: number;
  judgeId: string;
  teamId: string;
  assignedBy: string;
  assignedAt: string;
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
  previousRank?: number;
  rankMovement?: number;
  score?: number;
  isTied: boolean;
  qualified: boolean;
  published: boolean;
  timestamp: string;
}

export interface RankingSnapshot {
  id: string;
  roundId: number;
  rankingVersion: number;
  teamId: string;
  rank: number;
  previousRank?: number;
  rankMovement?: number;
  score?: number;
  qualified?: boolean;
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

export interface Track {
  id: string; // e.g., 'T-SOFTWARE'
  name: string; // e.g., 'Software Edition'
  shortName?: string;
  code?: string;
  description?: string;
  detailedDescription?: string;
  icon?: string;
  active: boolean;
  published: boolean;
  registrationEnabled?: boolean;
  problemSelectionEnabled?: boolean;
  submissionEnabled?: boolean;
  displayOrder?: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProblemStatement {
  id: string; // e.g., 'PS-001'
  trackId: string; // References Track.id
  title: string;
  shortTitle?: string;
  description: string;
  detailedStatement?: string;
  organization?: string;
  difficulty?: string;
  tags?: string[];
  constraints?: string;
  expectedOutcome?: string;
  links: { label: string; url: string; }[];
  customSections: { heading: string; content: string; }[];
  isReleased: boolean;
  active: boolean;
  published: boolean;
  selectionEnabled?: boolean;
  submissionEnabled?: boolean;
  displayOrder?: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetRoles: Role[];
  priority: 'low' | 'normal' | 'high' | 'critical';
  authorId: string;
  authorName?: string;
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

export type CatalogItemType = 'registration' | 'food' | 'addon' | 'swag' | 'stay';
export type EntitlementType = 'NON_CONSUMABLE' | 'ONE_TIME' | 'QUANTITY_BASED' | 'ACCESS_PASS' | 'PERIOD_BASED';
export type EntitlementOwnership = 'PARTICIPANT' | 'TEAM';

export interface CatalogItem {
  id: string; // e.g., 'food-day1'
  name: string;
  price: number;
  type: CatalogItemType;
  description?: string;
  imageUrl?: string;
  entitlementType?: EntitlementType;
  ownership?: EntitlementOwnership;
  redemptionRequired?: boolean;
  purchaseEnabled?: boolean;
  redemptionEnabled?: boolean;
  inventory?: number | null;
  maxQuantityPerParticipant?: number | null;
  isActive?: boolean;
}

export interface EventTimelineItem {
  id: string;
  title: string;
  description: string;
  time: string; // ISO string 
  day: number; // 1 or 2
}

export interface EventConfig {
  id: 'master';
  activeRoundId: string;
  isRegistrationOpen: boolean;
  registrationFeeAmount?: number;
  isHackathonActive: boolean;
  announcementsEnabled: boolean;
  catalog?: CatalogItem[]; // Dynamic pricing catalog
  timeline?: EventTimelineItem[]; // Dynamic event schedule timeline
  isSubmissionOpen?: boolean;
  submissionDeadline?: string;
  autoLockAfterDeadline?: boolean;
  allowLateSubmission?: boolean;
  allowSubmissionEditing?: boolean;
  allowEditingAfterSubmission?: boolean;
  trackSelectionLocked?: boolean;
  trackSelectionDeadline?: string;
  updatedAt: string;
}

export type RoundStatus = 'DRAFT' | 'SCHEDULED' | 'SUBMISSION_OPEN' | 'SUBMISSION_CLOSED' | 'EVALUATION_OPEN' | 'EVALUATION_CLOSED' | 'RESULTS_PENDING' | 'RESULTS_PUBLISHED' | 'LOCKED' | 'COMPLETED' | 'CANCELLED';

export interface Round {
  id: string;
  name: string;
  displayName: string;
  order: number;
  type?: 'Screening' | 'Preliminary' | 'Technical' | 'Development' | 'Presentation' | 'Final' | 'Custom';
  description?: string;
  instructions?: string;
  
  // Timing Config
  startAt?: string;
  endAt?: string;
  submissionOpenAt?: string;
  submissionCloseAt?: string;
  evaluationOpenAt?: string;
  evaluationCloseAt?: string;
  resultPublicationAt?: string;
  showLeaderboard?: boolean;
  showScorecard?: boolean;
  showCriteria?: boolean;
  
  // Rules Config
  evaluationMode?: 'SUBMISSION' | 'LIVE' | 'BOTH';
  maxRevisions?: number; // E.g., 2 means v1 is initial, v2 is rev1, v3 is rev2.
  allowLateSubmission?: boolean;
  evaluationCriteria?: CriterionTemplate[];
  
  status: RoundStatus;
  qualifiedCount: number;
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

export type OrderStatus = 'pending_payment' | 'paid' | 'cancelled' | 'refunded' | 'delivered';

export interface OrderItemAllocation {
  participantId: string;
  quantity: number;
}

export interface OrderItem {
  id: string; // SKU or item ID
  name: string;
  type: CatalogItemType | string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  allocations?: OrderItemAllocation[];
}

export interface Order {
  id: string; // Order ID
  participantId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type EntitlementStatus = 'active' | 'revoked';

export interface Entitlement {
  id: string; // e.g. ENT-xxxx
  participantId?: string; // If owned by participant
  teamId?: string; // If owned by team
  productId: string;
  productNameSnapshot: string;
  category: CatalogItemType;
  entitlementType: EntitlementType;
  ownership: EntitlementOwnership;
  quantityPurchased: number;
  quantityUsed: number;
  quantityRemaining: number;
  status: EntitlementStatus;
  orderId?: string;
  paymentReference?: string;
  validFrom?: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export type RedemptionStatus = 'redeemed' | 'reversed';
export type RedemptionMethod = 'qrScan' | 'manual';

export interface RedemptionRecord {
  id: string; // e.g. RED-xxxx
  participantId: string;
  teamId?: string;
  entitlementId: string;
  productId: string;
  category: CatalogItemType;
  quantity: number;
  volunteerUid: string;
  volunteerName: string;
  location: string; // e.g. 'Food Desk 1'
  method: RedemptionMethod;
  status: RedemptionStatus;
  requestId: string; // For idempotency
  timestamp: string;
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
}
