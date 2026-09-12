import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Form';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { useToast } from '../../../components/ui/ToastContext';
import { EvaluationService } from '@shared/services/EvaluationService';
import { ParticipantService } from '@shared/services/ParticipantService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@shared/lib/firebase';
import type { Staff, Team, JudgeAssignment } from '@shared/types/models';
import { useAuth } from '@shared/contexts/AuthContext';
import { Trash2, Plus, Zap, Users, Info, Settings2, Replace } from 'lucide-react';
import { calculateBalancedAssignments } from '@shared/utils/assignmentAlgorithm';
import type { TeamInput, JudgeInput, ExistingAssignment } from '@shared/utils/assignmentAlgorithm';
import { JudgeWorkloadDashboard } from '../../../components/admin/JudgeWorkloadDashboard';
import { AssignmentPreviewModal } from '../../../components/admin/AssignmentPreviewModal';
import { ReassignModal } from '../../../components/admin/ReassignModal';

export default function JudgeAssignmentManager() {
  const { user } = useAuth();
  const { success, error } = useToast();
  
  const [activeTab, setActiveTab] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [activeRound, setActiveRound] = useState(1);
  const [judges, setJudges] = useState<Staff[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  
  // Auto Assign State
  const [targetJudgesPerTeam, setTargetJudgesPerTeam] = useState(1);
  const [targetTeamsPerJudge, setTargetTeamsPerJudge] = useState(15);
  const [keepExisting, setKeepExisting] = useState(true);
  const [trackFilter, setTrackFilter] = useState<string>('ALL');
  const [excludedJudges, setExcludedJudges] = useState<Set<string>>(new Set());
  const [customCapacities, setCustomCapacities] = useState<Record<string, number>>({});
  
  // Manual State
  const [selectedJudge, setSelectedJudge] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // Reassign Modal
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<{teamId: string, oldJudgeId: string} | null>(null);

  useEffect(() => {
    const unsubStaff = ParticipantService.subscribeToAllStaff((staff) => {
      setJudges(staff.filter(s => s.roles?.includes('judge') || s.role === 'judge').filter(j => j.status?.toLowerCase() !== 'inactive'));
    });
    
    const q = query(collection(db, 'teams'), where('status', 'not-in', ['eliminated', 'disqualified']));
    const unsubTeams = onSnapshot(q, (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
    });
    
    return () => {
      unsubStaff();
      unsubTeams();
    };
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'evaluationAssignments'), where('roundId', '==', activeRound));
    const unsub = onSnapshot(q, (snap) => {
      setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() } as JudgeAssignment)));
    });
    return () => unsub();
  }, [activeRound]);

  const activeAssignments = useMemo(() => assignments.filter(a => a.status !== 'REMOVED'), [assignments]);

  const judgeWorkloads = useMemo(() => {
    const workloads: Record<string, number> = {};
    activeAssignments.forEach(a => {
      workloads[a.judgeId] = (workloads[a.judgeId] || 0) + 1;
    });
    return workloads;
  }, [activeAssignments]);

  const uniqueTracks = useMemo(() => {
    const t = new Set<string>();
    teams.forEach(team => {
      if (team.track) t.add(team.track);
    });
    return Array.from(t);
  }, [teams]);

  const handleGeneratePreview = () => {
    const eligibleTeams = trackFilter === 'ALL' ? teams : teams.filter(t => t.track === trackFilter);
    const eligibleJudges = judges.filter(j => !excludedJudges.has(j.id));

    const teamInputs: TeamInput[] = eligibleTeams.map(t => ({ id: t.id, track: t.track }));
    const judgeInputs: JudgeInput[] = eligibleJudges.map(j => ({
      id: j.id,
      currentWorkload: judgeWorkloads[j.id] || 0,
      capacity: customCapacities[j.id] !== undefined ? customCapacities[j.id] : targetTeamsPerJudge
    }));

    const existing: ExistingAssignment[] = activeAssignments.map(a => ({ teamId: a.teamId, judgeId: a.judgeId, status: a.status }));

    const result = calculateBalancedAssignments(teamInputs, judgeInputs, existing, {
      judgesPerTeam: targetJudgesPerTeam,
      strategy: 'balanced',
      keepExisting
    });

    const existingInScope = activeAssignments.filter(a => eligibleTeams.some(t => t.id === a.teamId));
    let toRemove = 0;
    if (!keepExisting) {
      toRemove = existingInScope.length;
    }

    // Calculate unassigned
    let unassignedCount = 0;
    eligibleTeams.forEach(t => {
      const assignedCount = result.filter(r => r.teamId === t.id).length + (keepExisting ? existing.filter(e => e.teamId === t.id && e.status !== 'REMOVED').length : 0);
      if (assignedCount < targetJudgesPerTeam) unassignedCount++;
    });

    const warnings = [];
    if (unassignedCount > 0) warnings.push(`Capacity insufficient. ${unassignedCount} teams could not meet the target of ${targetJudgesPerTeam} judge(s). Add more judges or increase capacity.`);
    if (result.length === 0 && toRemove === 0) warnings.push(`No new assignments generated. Distribution is already met.`);

    setPreviewData({
      roundId: activeRound,
      totalTeamsProcessed: eligibleTeams.length,
      totalJudgesUsed: eligibleJudges.length,
      assignmentsToCreate: result.length,
      assignmentsToRemove: toRemove,
      existingKept: keepExisting ? existingInScope.length : 0,
      unassignedCount,
      warnings,
      rawCreatePayload: result.map(r => ({ ...r, source: 'AUTO' })),
      rawRemovePayload: !keepExisting ? existingInScope.map(a => a.id) : []
    });
    setIsPreviewOpen(true);
  };

  const applyBulkAssignments = async () => {
    if (!previewData) return;
    setIsAssigning(true);
    try {
      const res = await EvaluationService.assignJudgesBulk(activeRound, previewData.rawCreatePayload, previewData.rawRemovePayload);
      success(`Applied ${res.processed} assignment changes successfully.`);
      setIsPreviewOpen(false);
    } catch (err: any) {
      error(`Apply failed: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleManualAssign = async () => {
    if (!selectedJudge || !selectedTeam || !user) return;
    setIsAssigning(true);
    try {
      // Simulate bulk call for a single manual assign
      await EvaluationService.assignJudgesBulk(activeRound, [{ judgeId: selectedJudge, teamId: selectedTeam, source: 'MANUAL' }], []);
      success('Judge Assigned manually.');
      setSelectedTeam('');
    } catch (err: any) {
      error(`Assignment failed: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemove = async (judgeId: string, teamId: string) => {
    try {
      await EvaluationService.removeAssignment(judgeId, teamId, activeRound);
      success('Assignment Removed');
    } catch (err: any) {
      error(`Removal failed: ${err.message}`);
    }
  };

  const handleReassign = async (newJudgeId: string) => {
    if (!reassignTarget) return;
    setIsAssigning(true);
    try {
      const oldAssignmentId = `${activeRound}_${reassignTarget.oldJudgeId}_${reassignTarget.teamId}`;
      await EvaluationService.assignJudgesBulk(
        activeRound, 
        [{ judgeId: newJudgeId, teamId: reassignTarget.teamId, source: 'MANUAL_SWAP' }], 
        [oldAssignmentId]
      );
      success('Judge Swap successful.');
      setIsReassignOpen(false);
      setReassignTarget(null);
    } catch (err: any) {
      error(`Swap failed: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const judgeOptions = judges.map(j => ({ value: j.id, label: j.name, subLabel: `${j.id} (Load: ${judgeWorkloads[j.id] || 0})` }));
  const teamOptions = teams.map(t => ({ value: t.id, label: t.name, subLabel: `${t.track || 'Unassigned'} • ${t.id}` }));

  const filteredManualAssignments = activeAssignments.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const judge = judges.find(j => j.id === a.judgeId);
    const team = teams.find(t => t.id === a.teamId);
    return judge?.name.toLowerCase().includes(q) || team?.name.toLowerCase().includes(q) || team?.track?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bebas tracking-widest text-white">Assignment Center</h2>
          <p className="text-sm text-gray-400">Distribute judges to teams for evaluations</p>
        </div>
        <div className="flex items-center gap-4 bg-black/30 p-2 rounded-lg border border-white/5">
          <label className="text-sm text-gray-400 pl-2">Active Round:</label>
          <Input type="number" value={activeRound} onChange={(e) => setActiveRound(Number(e.target.value))} className="w-20 h-8" />
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-black/40 border-white/5">
          <div className="text-xs text-gray-500 uppercase">Total Teams</div>
          <div className="text-2xl font-bebas text-white mt-1">{teams.length}</div>
        </Card>
        <Card className="p-4 bg-black/40 border-white/5">
          <div className="text-xs text-gray-500 uppercase">Available Judges</div>
          <div className="text-2xl font-bebas text-white mt-1">{judges.length}</div>
        </Card>
        <Card className="p-4 bg-black/40 border-white/5">
          <div className="text-xs text-gray-500 uppercase">Assigned Teams</div>
          <div className="text-2xl font-bebas text-white mt-1">{new Set(activeAssignments.map(a => a.teamId)).size}</div>
        </Card>
        <Card className="p-4 bg-black/40 border-white/5">
          <div className="text-xs text-gray-500 uppercase">Avg Workload</div>
          <div className="text-2xl font-bebas text-white mt-1">{(activeAssignments.length / Math.max(judges.length, 1)).toFixed(1)}</div>
        </Card>
      </div>

      <div className="flex gap-4 border-b border-white/10">
        <button
          className={`pb-2 text-sm font-medium uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'AUTO' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('AUTO')}
        >
          Auto Assign Wizard
        </button>
        <button
          className={`pb-2 text-sm font-medium uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'MANUAL' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('MANUAL')}
        >
          Manual Grid & Workload
        </button>
      </div>

      {activeTab === 'AUTO' && (
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 md:col-span-2 space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bebas tracking-wide text-white border-b border-white/10 pb-2 flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary" /> 1. Select Teams
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Filter By Track</label>
                  <select 
                    value={trackFilter} 
                    onChange={e => setTrackFilter(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-primary h-10 outline-none"
                  >
                    <option value="ALL">All Eligible Teams</option>
                    {uniqueTracks.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex items-center text-sm text-gray-400 pt-6">
                  <span className="bg-primary/20 text-primary px-2 py-1 rounded">
                    {trackFilter === 'ALL' ? teams.length : teams.filter(t => t.track === trackFilter).length} teams selected
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bebas tracking-wide text-white border-b border-white/10 pb-2 flex items-center">
                <Settings2 className="w-5 h-5 mr-2 text-primary" /> 2. Configuration
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Judges per Team</label>
                  <select 
                    value={targetJudgesPerTeam} 
                    onChange={e => setTargetJudgesPerTeam(Number(e.target.value))}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-primary h-10 outline-none"
                  >
                    <option value={1}>1 Judge</option>
                    <option value={2}>2 Judges</option>
                    <option value={3}>3 Judges</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max Teams per Judge</label>
                  <Input type="number" value={targetTeamsPerJudge} onChange={e => setTargetTeamsPerJudge(Number(e.target.value))} className="h-10" />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="keepExisting"
                  checked={keepExisting}
                  onChange={e => setKeepExisting(e.target.checked)}
                  className="w-4 h-4 bg-black border-white/20 rounded text-primary focus:ring-primary focus:ring-offset-black"
                />
                <label htmlFor="keepExisting" className="text-sm text-gray-300">
                  Keep Existing Assignments (Only assign unassigned teams)
                </label>
              </div>
              {!keepExisting && (
                <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded flex items-center">
                  <Info className="w-4 h-4 mr-1 shrink-0" /> Warning: Unchecking this will REMOVE existing assignments for the selected scope before reassigning.
                </p>
              )}
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-bebas tracking-wide text-white border-b border-white/10 pb-2 flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary" /> 3. Select & Configure Judges
              </h3>
              <div className="bg-black/50 border border-white/10 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                {judges.map(judge => {
                  const isExcluded = excludedJudges.has(judge.id);
                  return (
                    <div key={judge.id} className={`flex items-center justify-between p-2 rounded ${isExcluded ? 'opacity-50 grayscale' : 'hover:bg-white/5'}`}>
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={!isExcluded}
                          onChange={(e) => {
                            const newSet = new Set(excludedJudges);
                            if (e.target.checked) newSet.delete(judge.id);
                            else newSet.add(judge.id);
                            setExcludedJudges(newSet);
                          }}
                          className="w-4 h-4 bg-black border-white/20 rounded text-primary focus:ring-primary focus:ring-offset-black"
                        />
                        <div>
                          <div className="text-sm text-white">{judge.name}</div>
                          <div className="text-xs text-gray-500">Current Load: {judgeWorkloads[judge.id] || 0}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400">Capacity:</label>
                        <Input 
                          type="number" 
                          value={customCapacities[judge.id] !== undefined ? customCapacities[judge.id] : targetTeamsPerJudge}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomCapacities(prev => ({
                              ...prev,
                              [judge.id]: val === '' ? targetTeamsPerJudge : Number(val)
                            }));
                          }}
                          disabled={isExcluded}
                          className="w-16 h-8 text-center text-sm"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button variant="primary" size="lg" className="font-bebas tracking-widest text-lg w-full md:w-auto" onClick={handleGeneratePreview}>
                <Zap className="w-5 h-5 mr-2" /> GENERATE PREVIEW
              </Button>
            </div>
          </Card>

          <div>
            <JudgeWorkloadDashboard judges={judges} workloads={judgeWorkloads} capacityPerJudge={targetTeamsPerJudge} />
          </div>
        </div>
      )}

      {activeTab === 'MANUAL' && (
        <div className="grid md:grid-cols-4 gap-6">
          <div className="md:col-span-3 space-y-6">
            <Card className="p-4 bg-black/40 border-white/5">
              <h3 className="text-sm font-semibold text-white mb-4">Manual Assign Exception</h3>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full relative z-20">
                  <label className="block text-sm text-gray-400 mb-1">Select Judge</label>
                  <SearchableSelect
                    options={judgeOptions}
                    value={selectedJudge}
                    onChange={setSelectedJudge}
                    placeholder="-- Choose Judge --"
                  />
                </div>
                <div className="flex-1 w-full relative z-10">
                  <label className="block text-sm text-gray-400 mb-1">Select Team</label>
                  <SearchableSelect
                    options={teamOptions}
                    value={selectedTeam}
                    onChange={setSelectedTeam}
                    placeholder="-- Choose Team --"
                  />
                </div>
                <Button variant="primary" onClick={handleManualAssign} disabled={!selectedJudge || !selectedTeam || isAssigning} className="h-10 shrink-0">
                  <Plus className="w-4 h-4 mr-2" /> ASSIGN
                </Button>
              </div>
            </Card>

            <Card className="p-0 border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#111]">
                <h3 className="text-sm font-semibold text-white">Active Assignments</h3>
                <Input 
                  type="text" 
                  placeholder="Search team or judge..." 
                  className="w-64 h-8 text-sm"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#1a1a1a] border-b border-white/10 text-xs text-gray-400 uppercase font-inter">
                    <tr>
                      <th className="px-4 py-3">Team</th>
                      <th className="px-4 py-3">Track</th>
                      <th className="px-4 py-3">Judge</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredManualAssignments.map(a => {
                      const judge = judges.find(j => j.id === a.judgeId);
                      const team = teams.find(t => t.id === a.teamId);
                      return (
                        <tr key={a.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{team?.name || a.teamId}</div>
                            <div className="text-xs text-gray-500 font-mono">{a.teamId}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-300 text-xs">
                            {team?.track || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-primary">{judge?.name || a.judgeId}</div>
                          </td>
                          <td className="px-4 py-3 flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setReassignTarget({ teamId: a.teamId, oldJudgeId: a.judgeId });
                                setIsReassignOpen(true);
                              }}
                              className="text-primary hover:bg-primary/20"
                            >
                              <Replace className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRemove(a.judgeId, a.teamId)} className="text-red-400 hover:bg-red-500/20">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredManualAssignments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No assignments match criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          <div>
            <JudgeWorkloadDashboard judges={judges} workloads={judgeWorkloads} capacityPerJudge={targetTeamsPerJudge} />
          </div>
        </div>
      )}

      <AssignmentPreviewModal 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={applyBulkAssignments}
        previewData={previewData}
        isApplying={isAssigning}
      />

      <ReassignModal
        isOpen={isReassignOpen}
        onClose={() => {
          setIsReassignOpen(false);
          setReassignTarget(null);
        }}
        onConfirm={handleReassign}
        team={reassignTarget ? teams.find(t => t.id === reassignTarget.teamId) || null : null}
        currentJudge={reassignTarget ? judges.find(j => j.id === reassignTarget.oldJudgeId) || null : null}
        judges={judges}
        workloads={judgeWorkloads}
        isAssigning={isAssigning}
      />
    </div>
  );
}
