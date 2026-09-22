import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, ArrowUpCircle, XCircle, RotateCcw, ShieldAlert, Key, UserPlus, UserMinus, FileText, CheckCircle, Clock, Search } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Form';
import { TeamService } from '@shared/services/TeamService';
import { ParticipantService } from '@shared/services/ParticipantService';
import { SubmissionService } from '@shared/services/SubmissionService';
import { EvaluationService } from '@shared/services/EvaluationService';
import { EntitlementService } from '@shared/services/EntitlementService';
import type { Team, Participant, Submission, JudgeAssignment, Staff, CatalogItem } from '@shared/types/models';
import { useToast } from '../../components/ui/ToastContext';
import { usePermissions } from '@shared/lib/permissions';
import { useAuth } from '@shared/contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@shared/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { SearchableSelect } from '../../components/ui/SearchableSelect';

export interface TeamDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
}

export function TeamDetailsModal({ isOpen, onClose, team }: TeamDetailsModalProps) {
  const { hasPermission } = usePermissions();
  const { profileData: profile } = useAuth();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  
  const [members, setMembers] = useState<Participant[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  // Add Member State
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');

  // Judge Assignments State
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  const [judges, setJudges] = useState<Staff[]>([]);
  const [isAssigningJudge, setIsAssigningJudge] = useState(false);
  const [selectedJudgeId, setSelectedJudgeId] = useState('');

  // Addon Modal State
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [selectedParticipantForAddon, setSelectedParticipantForAddon] = useState<Participant | null>(null);
  const [availableProducts, setAvailableProducts] = useState<CatalogItem[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');

  useEffect(() => {
    if (isAddingMember && availableParticipants.length === 0) {
      setIsLoadingParticipants(true);
      ParticipantService.getAllParticipants().then(pts => {
        // Show everyone except current team members
        setAvailableParticipants(pts.filter(p => !team?.memberIds.includes(p.id)));
        setIsLoadingParticipants(false);
      });
    }
  }, [isAddingMember, team?.memberIds]);

  useEffect(() => {
    if (!isOpen || !team) return;
    
    setLoading(true);
    let unsubSub = () => {};

    const fetchData = async () => {
      try {
        const pts = await ParticipantService.getParticipantsByIds(team.memberIds);
        setMembers(pts);
        
        const roundId = team.currentRound || 1;
        unsubSub = SubmissionService.subscribeToTeamSubmission(team.id, roundId, (sub) => {
          setSubmission(sub);
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const unsubStaff = ParticipantService.subscribeToAllStaff((staff) => {
      setJudges(staff.filter(s => s.role === 'judge'));
    });

    const roundId = team.currentRound || 1;
    const unsubAssignments = EvaluationService.subscribeToTeamAssignments(team.id, roundId, (assigns) => {
      setAssignments(assigns.filter(a => a.status !== 'REMOVED'));
    });

    const unsubProducts = onSnapshot(collection(db, 'eventProducts'), (snap) => {
      const prods: CatalogItem[] = [];
      snap.forEach(doc => prods.push({ id: doc.id, ...doc.data() } as CatalogItem));
      setAvailableProducts(prods.filter(p => p.isActive));
    });

    return () => {
      unsubSub();
      unsubStaff();
      unsubAssignments();
      unsubProducts();
    };
  }, [isOpen, team?.id, team?.memberIds.length, team?.currentRound]);

  if (!team) return null;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = newMemberId.trim();
    if (!identifier) return;
    
    try {
      let participantId = identifier;
      
      // If it looks like an email or Glitch ID, query for the actual document ID
      if (identifier.includes('@') || identifier.toUpperCase().startsWith('GL')) {
        const field = identifier.includes('@') ? 'email' : 'glitchId';
        const q = query(collection(db, 'participants'), where(field, '==', identifier));
        const snap = await getDocs(q);
        if (snap.empty) {
          throw new Error(`No participant found with ${field}: ${identifier}`);
        }
        participantId = snap.docs[0].id;
      }
      
      await TeamService.adminAddTeamMember(team.id, participantId);
      success("Member Added", "Successfully added participant to team.");
      setIsAddingMember(false);
      setNewMemberId('');
      
      // Update available participants list
      setAvailableParticipants(prev => prev.filter(p => p.id !== participantId));
      
      // Refresh members
      const pts = await ParticipantService.getParticipantsByIds([...team.memberIds, participantId]);
      setMembers(pts);
    } catch (err: any) {
      toastError("Action Failed", err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    try {
      await TeamService.adminRemoveTeamMember(team.id, memberId);
      success("Member Removed", "Successfully removed participant.");
      setMembers(prev => prev.filter(p => p.id !== memberId));
    } catch (err: any) {
      toastError("Action Failed", err.message);
    }
  };

  const handleMakeLeader = async (memberId: string) => {
    if (!window.confirm("Are you sure you want to transfer leadership to this member?")) return;
    try {
      await TeamService.adminTransferLeadership(team.id, memberId);
      success("Leadership Transferred", "Successfully transferred team leadership.");
      team.leaderId = memberId; // local optimistic update
    } catch (err: any) {
      toastError("Action Failed", err.message);
    }
  };

  const handleAssignJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJudgeId || !profile) return;
    try {
      const roundId = team.currentRound || 1;
      await EvaluationService.assignJudge(selectedJudgeId, team.id, roundId, profile.uid);
      success("Judge Assigned", "Successfully assigned judge to team.");
      setIsAssigningJudge(false);
      setSelectedJudgeId('');
    } catch (err: any) {
      toastError("Action Failed", err.message);
    }
  };

  const handleRemoveJudge = async (judgeId: string) => {
    if (!window.confirm("Are you sure you want to remove this judge assignment?")) return;
    try {
      const roundId = team.currentRound || 1;
      await EvaluationService.removeAssignment(judgeId, team.id, roundId);
      success("Assignment Removed", "Successfully removed judge assignment.");
    } catch (err: any) {
      toastError("Action Failed", err.message);
    }
  };

  const handleGrantAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !profile || !selectedParticipantForAddon) return;
    try {
      await EntitlementService.grantEntitlement(selectedParticipantForAddon.id, team.id, selectedProductId, 1, profile.uid);
      const prod = availableProducts.find(p => p.id === selectedProductId);
      success("Success", `Granted ${prod?.name || 'addon'} to ${selectedParticipantForAddon.name}.`);
      setIsAddonModalOpen(false);
      setSelectedProductId('');
      setSelectedParticipantForAddon(null);
    } catch (err: any) {
      toastError("Action Failed", err.message);
    }
  };

  const canManageTeams = hasPermission('teams.manage');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Team Dashboard: ${team.name}`} maxWidth="4xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Team Details & Submission */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 shadow-inner">
            <h3 className="font-bebas text-2xl text-white tracking-widest mb-4">Overview</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Status</p>
                <Badge variant={team.status === 'locked' ? 'primary' : 'warning'}>{team.status.toUpperCase()}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Payment</p>
                {team.paymentStatus === 'paid' ? (
                  <Badge variant="success" className="bg-green-500/10 text-green-400">PAID</Badge>
                ) : (
                  <Badge variant="warning">PENDING</Badge>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Track & Problem</p>
                <p className="text-sm font-medium text-white">{team.track || 'Unassigned'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{team.problemId || 'No problem selected'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Location</p>
                <p className="text-sm font-medium text-white">{team.assignedRoom || 'Unassigned Room'}</p>
                {team.assignedSeat && <p className="text-xs text-gray-400 mt-0.5">Seat {team.assignedSeat}</p>}
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 shadow-inner">
            <h3 className="font-bebas text-2xl text-white tracking-widest mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Submission (Round {team.currentRound || 1})
            </h3>
            {submission ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">Submitted (v{submission.currentVersion})</span>
                </div>
                <div className="text-xs text-gray-500">
                  Last Updated: {new Date(submission.updatedAt).toLocaleString()}
                </div>
                {canManageTeams && (
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => { onClose(); navigate('/workspace/submissions'); }}>
                    View in Submissions Dashboard
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Clock className="w-4 h-4" /> No submission for current round yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Members & Management */}
        <div className="lg:col-span-2 space-y-6">
          
          {profile?.role === 'judge' && (
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-5 flex items-center justify-between shadow-inner">
              <div>
                <h3 className="font-bebas text-xl text-purple-400 tracking-wider">Evaluation Ready</h3>
                <p className="text-sm text-purple-200/70 font-inter mt-1">Navigate to the workspace to grade this team's submission.</p>
              </div>
              <Button variant="primary" onClick={() => navigate(`/workspace/teams/${team.id}?roundId=${team.currentRound || 1}`)}>
                Evaluate Team
              </Button>
            </div>
          )}

          <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 shadow-inner">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bebas text-2xl text-white tracking-widest flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Team Members ({team.memberIds.length}/4)
              </h3>
              {canManageTeams && team.memberIds.length < 4 && !isAddingMember && (
                <Button variant="outline" size="sm" onClick={() => setIsAddingMember(true)} className="text-primary border-primary/30 hover:bg-primary/10">
                  <UserPlus className="w-4 h-4 mr-2" /> Add Member
                </Button>
              )}
            </div>

            {isAddingMember && (
              <form onSubmit={handleAddMember} className="mb-6 p-4 bg-black/40 border border-primary/30 rounded-lg flex flex-col md:flex-row gap-3 md:items-end">
                <div className="flex-1 w-full relative">
                  <label className="text-xs text-gray-400 mb-1 block">Select Participant</label>
                  {isLoadingParticipants ? (
                    <div className="h-10 bg-black/50 border border-white/10 rounded-lg flex items-center px-3 text-gray-500 text-sm">
                      Loading participants...
                    </div>
                  ) : (
                    <SearchableSelect 
                      value={newMemberId}
                      onChange={setNewMemberId}
                      placeholder="Search name, ID or email..."
                      options={availableParticipants.map(p => ({
                        value: p.id,
                        label: p.name,
                        subLabel: `${p.email} • ${p.glitchId || p.id}${p.teamId ? ' (Already in a team)' : ''}`,
                        disabled: !!p.teamId
                      }))}
                    />
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button type="submit" variant="primary" className="mb-[2px] h-10" disabled={!newMemberId || isLoadingParticipants}>Add</Button>
                  <Button type="button" variant="ghost" onClick={() => { setIsAddingMember(false); setNewMemberId(''); }} className="mb-[2px] h-10">Cancel</Button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="text-center p-8 text-gray-500">Loading members...</div>
            ) : (
              <div className="space-y-3">
                {members.map(member => {
                  const isLeader = member.id === team.leaderId;
                  return (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-lg hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                          {isLeader ? <Key className="w-5 h-5 text-yellow-500" /> : <Users className="w-5 h-5 text-gray-400" />}
                        </div>
                        <div>
                          <p className="text-white font-medium flex items-center gap-2">
                            {member.name}
                            {isLeader && <Badge variant="warning" className="text-[10px] px-1.5 py-0">LEADER</Badge>}
                          </p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{member.email} • {member.glitchId || member.id}</p>
                        </div>
                      </div>
                      
                      {canManageTeams && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-8 border-purple-500/30 text-purple-400 hover:bg-purple-500/10" onClick={() => { setSelectedParticipantForAddon(member); setIsAddonModalOpen(true); }} title="Manage Addons & Entitlements">
                            Addons
                          </Button>
                          
                          {!isLeader && (
                            <Button variant="outline" size="sm" onClick={() => handleMakeLeader(member.id)} className="h-8 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10" title="Make Leader">
                              Promote
                            </Button>
                          )}
                          {!isLeader && (
                            <Button variant="outline" size="sm" onClick={() => handleRemoveMember(member.id)} className="h-8 border-red-500/30 text-red-500 hover:bg-red-500/10" title="Remove Member">
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Quick Judge Assignment Section */}
          {canManageTeams && (
            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 shadow-inner">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bebas text-2xl text-white tracking-widest flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" /> Assigned Judges ({assignments.length})
                </h3>
                {!isAssigningJudge && (
                  <Button variant="outline" size="sm" onClick={() => setIsAssigningJudge(true)} className="text-primary border-primary/30 hover:bg-primary/10">
                    <UserPlus className="w-4 h-4 mr-2" /> Assign Judge
                  </Button>
                )}
              </div>

              {isAssigningJudge && (
                <form onSubmit={handleAssignJudge} className="mb-6 p-4 bg-black/40 border border-primary/30 rounded-lg flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">Select Judge</label>
                    <select 
                      required 
                      value={selectedJudgeId}
                      onChange={e => setSelectedJudgeId(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-sm"
                    >
                      <option value="">-- Choose Judge --</option>
                      {judges.map(j => {
                        const isAssigned = assignments.some(a => a.judgeId === j.id);
                        return (
                          <option key={j.id} value={j.id} disabled={isAssigned}>
                            {j.name} {isAssigned ? '(Already Assigned)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <Button type="submit" variant="primary" className="mb-[2px]">Assign</Button>
                  <Button type="button" variant="ghost" onClick={() => setIsAssigningJudge(false)} className="mb-[2px]">Cancel</Button>
                </form>
              )}

              <div className="space-y-3">
                {assignments.length === 0 ? (
                  <div className="text-center p-4 text-gray-500 text-sm">No judges assigned for Round {team.currentRound || 1}.</div>
                ) : (
                  assignments.map(assignment => {
                    const judge = judges.find(j => j.id === assignment.judgeId);
                    return (
                      <div key={assignment.id} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-lg hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                            <CheckCircle className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{judge?.name || assignment.judgeId}</p>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">{judge?.email || 'Unknown'}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleRemoveJudge(assignment.judgeId)} className="h-7 w-7 p-0 border-red-500/30 text-red-500 hover:bg-red-500/10" title="Remove Judge">
                          <UserMinus className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
          
        </div>
      </div>

      {/* Addon Modal */}
      {isAddonModalOpen && selectedParticipantForAddon ? (
        <Modal isOpen={isAddonModalOpen} onClose={() => { setIsAddonModalOpen(false); setSelectedParticipantForAddon(null); }} title={`Grant Entitlement: ${selectedParticipantForAddon.name}`}>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Select an active product from the catalog to provision it to this participant.
            </p>
            <form onSubmit={handleGrantAddon} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white mb-1 block">Select Addon</label>
                <div className="mt-1">
                  <SearchableSelect 
                    value={selectedProductId}
                    onChange={(val) => setSelectedProductId(val)}
                    placeholder="-- Choose an active product --"
                    options={availableProducts.map(p => ({
                      value: p.id,
                      label: p.name,
                      subLabel: p.type.toUpperCase()
                    }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <Button variant="ghost" type="button" onClick={() => { setIsAddonModalOpen(false); setSelectedParticipantForAddon(null); }}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={!selectedProductId}>Grant Addon</Button>
              </div>
            </form>
          </div>
        </Modal>
      ) : null}

    </Modal>
  );
}
