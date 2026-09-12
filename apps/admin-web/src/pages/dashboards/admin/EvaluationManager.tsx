import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckSquare, Search, ShieldAlert, Edit3, Settings,
  Users, MapPin, CheckCircle, Clock, BarChart3, ListTodo, Lock, Unlock, AlertTriangle, FileText
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastContext';
import { EvaluationService } from '@shared/services/EvaluationService';
import { RoundService } from '@shared/services/RoundService';
import type { Evaluation, Team, Round, CriterionTemplate, JudgeAssignment } from '@shared/types/models';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '@shared/lib/firebase';
import { useAuth } from '@shared/contexts/AuthContext';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { TeamService } from '@shared/services/TeamService';
import { ParticipantService } from '@shared/services/ParticipantService';
import { EvaluationDetailModal } from './EvaluationDetailModal';

type Tab = 'overview' | 'criteria' | 'judges' | 'evaluations';

export default function EvaluationManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  
  // State
  const [rounds, setRounds] = useState<Round[]>([]);
  const [activeRoundId, setActiveRoundId] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [criteria, setCriteria] = useState<CriterionTemplate[]>([]);
  const [criteriaLocked, setCriteriaLocked] = useState(false);
  
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoadingRounds, setIsLoadingRounds] = useState(true);
  
  // Selection
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  // 0. Fetch Staff
  useEffect(() => {
    const unsub = ParticipantService.subscribeToAllStaff(setStaffList);
    return unsub;
  }, []);
  
  // 1. Fetch Rounds
  useEffect(() => {
    const fetchRounds = async () => {
      try {
        const fetchedRounds = await RoundService.getAllRounds();
        setRounds(fetchedRounds.sort((a, b) => Number(a.id) - Number(b.id)));
        if (fetchedRounds.length > 0 && !activeRoundId) {
          // Select open evaluation round, else the first one
          const openRound = fetchedRounds.find(r => r.status === 'EVALUATION_OPEN');
          setActiveRoundId(openRound ? openRound.id.toString() : fetchedRounds[0].id.toString());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingRounds(false);
      }
    };
    fetchRounds();
  }, []);

  // 2. Fetch Teams globally
  useEffect(() => {
    const q = query(collection(db, 'teams'), where('status', 'not-in', ['eliminated', 'disqualified']));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Team));
      setTeams(data);
    });
    return () => unsub();
  }, []);

  // 3. Listeners scoped to active round
  useEffect(() => {
    if (!activeRoundId) return;
    const roundIdNum = Number(activeRoundId);
    
    const unsubCriteria = EvaluationService.subscribeToCriteria(roundIdNum, (c) => setCriteria(c));
    const unsubAssigns = EvaluationService.subscribeToRoundAssignments(roundIdNum, (a) => setAssignments(a));
    const unsubEvals = EvaluationService.subscribeToRoundEvaluations(roundIdNum, (e) => {
      setEvaluations(e);
      setCriteriaLocked(e.length > 0);
    });

    return () => {
      unsubCriteria();
      unsubAssigns();
      unsubEvals();
    };
  }, [activeRoundId]);

  // Derived Stats
  const stats = useMemo(() => {
    const totalTeams = teams.length;
    const totalAssignments = assignments.length;
    
    // An evaluation is completed if it is 'submitted', 'locked'
    const completedEvals = evaluations.filter(e => e.status === 'submitted' || e.locked).length;
    const reopenedEvals = evaluations.filter(e => e.status === 'reopened').length;
    const draftEvals = evaluations.filter(e => e.status === 'draft').length;
    
    // Pending = total assignments - (completed + draft + reopened)
    const pendingEvals = Math.max(0, totalAssignments - evaluations.length);
    
    // Overall completion % based on assignments
    const completionPct = totalAssignments > 0 ? Math.round((completedEvals / totalAssignments) * 100) : 0;
    
    return {
      totalTeams,
      totalAssignments,
      completedEvals,
      reopenedEvals,
      draftEvals,
      pendingEvals,
      completionPct,
      totalJudges: new Set(assignments.map(a => a.judgeId)).size
    };
  }, [teams, assignments, evaluations]);

  // Modals Handlers
  const handleReopen = async (reason: string) => {
    if (!selectedEvaluation || !user) return;
    await EvaluationService.unlockEvaluation(selectedEvaluation.id, user.uid, reason);
    setSelectedEvaluation(null); // Force reload or close modal
  };

  const handleCorrect = async (scores: Record<string, number>, newTotal: number, reason: string) => {
    if (!selectedEvaluation || !user) return;
    await EvaluationService.adminCorrectEvaluation(selectedEvaluation.id, scores, newTotal, reason);
    setSelectedEvaluation(null);
  };

  if (isLoadingRounds) {
    return <div className="p-8"><Skeleton className="h-24 w-full mb-4" /><Skeleton className="h-96 w-full" /></div>;
  }

  const activeRoundData = rounds.find(r => r.id.toString() === activeRoundId);

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* HEADER & ROUND SELECTOR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-black/40 border border-white/10 p-6 rounded-2xl">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-primary" /> EVALUATION MANAGER
          </h2>
          <p className="font-inter text-gray-400 mt-1">Manage criteria, monitor judge progress and coordinate score operations.</p>
        </div>
        
        <div className="flex flex-col gap-2">
           <label className="text-xs font-mono text-gray-500 uppercase">Selected Round</label>
           <select 
             className="bg-black border border-white/20 text-white rounded-lg px-4 py-2 font-bebas text-xl tracking-wider min-w-[200px] focus:border-primary outline-none"
             value={activeRoundId}
             onChange={e => setActiveRoundId(e.target.value)}
           >
             {rounds.map(r => (
               <option key={r.id} value={r.id.toString()}>
                 Round {r.id} — {r.name} {r.status === 'EVALUATION_OPEN' ? '(OPEN)' : ''}
               </option>
             ))}
           </select>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 border-b border-white/10 pb-px">
        {[
          { id: 'overview', label: 'OVERVIEW', icon: BarChart3 },
          { id: 'criteria', label: 'CRITERIA', icon: Settings },
          { id: 'judges', label: 'JUDGE PROGRESS', icon: Users },
          { id: 'evaluations', label: 'EVALUATIONS', icon: ListTodo }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-6 py-3 font-bebas tracking-wider text-lg transition-colors border-b-2 ${
                isActive ? 'text-primary border-primary bg-primary/5' : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-y-auto">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <StatCard label="Total Teams" value={stats.totalTeams} />
              <StatCard label="Active Judges" value={stats.totalJudges} />
              <StatCard label="Assignments" value={stats.totalAssignments} />
              <StatCard label="Pending" value={stats.pendingEvals} color="text-gray-500" />
              <StatCard label="Draft" value={stats.draftEvals} color="text-yellow-500" />
              <StatCard label="Reopened" value={stats.reopenedEvals} color="text-orange-500" />
              <StatCard label="Completed" value={stats.completedEvals} color="text-green-500" />
            </div>

            <Card className="p-6 border border-white/10 bg-black/40">
              <h3 className="font-bebas text-2xl text-white mb-6">Round Evaluation Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-mono text-gray-400">
                  <span>{stats.completedEvals} / {stats.totalAssignments} Completed</span>
                  <span className="text-primary">{stats.completionPct}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden flex">
                   <div className="bg-green-500 h-full transition-all" style={{ width: `${(stats.completedEvals/stats.totalAssignments)*100 || 0}%` }} title="Completed" />
                   <div className="bg-orange-500 h-full transition-all" style={{ width: `${(stats.reopenedEvals/stats.totalAssignments)*100 || 0}%` }} title="Reopened" />
                   <div className="bg-yellow-500 h-full transition-all" style={{ width: `${(stats.draftEvals/stats.totalAssignments)*100 || 0}%` }} title="Drafts" />
                </div>
                <div className="flex gap-4 mt-2 text-xs font-inter text-gray-500">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"/> Completed</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"/> Reopened</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"/> Draft</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-white/10"/> Pending</span>
                </div>
              </div>
            </Card>

            <div className="flex justify-between items-center bg-primary/10 border border-primary/20 p-6 rounded-xl">
               <div>
                 <h3 className="font-bebas text-2xl text-white">Results Handoff</h3>
                 <p className="text-sm font-inter text-gray-400 max-w-lg mt-1">Once evaluations are sufficiently complete, you must calculate and publish the final results via the Results Manager.</p>
               </div>
               <Button variant="primary" onClick={() => navigate('/workspace/results')}>Go To Results Manager</Button>
            </div>
          </div>
        )}

        {/* CRITERIA TAB */}
        {activeTab === 'criteria' && (
          <div className="max-w-4xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bebas text-3xl tracking-widest text-white">Round Evaluation Criteria</h3>
                <p className="text-gray-400 font-inter">Canonical scoring rubric for Round {activeRoundId}.</p>
              </div>
              <Button variant="outline" leftIcon={Edit3} onClick={() => navigate(`/workspace/rounds/${activeRoundId}`)}>
                Open Round Settings
              </Button>
            </div>

            {criteriaLocked && (
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-4 text-red-500">
                <Lock className="w-6 h-6 shrink-0" />
                <div className="text-sm">
                  <p className="font-bold">CRITERIA LOCKED</p>
                  <p>Judging has started for this round. Criteria cannot be changed safely because evaluations already exist.</p>
                </div>
              </div>
            )}

            <Card className="p-0 overflow-hidden border-white/10">
              <div className="p-6 bg-black/40 space-y-4">
                {criteria.map((c, idx) => (
                  <div key={c.id} className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-lg">
                    <div className="flex gap-4 items-center">
                      <div className="font-bebas text-2xl text-gray-600 w-8">{idx + 1}</div>
                      <div>
                        <h4 className="font-bebas text-xl text-white tracking-wide">{c.name}</h4>
                        {c.description && <p className="text-sm font-inter text-gray-400 mt-1">{c.description}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="font-bebas text-2xl text-primary">{c.maxScore} <span className="text-sm text-gray-500">pts</span></div>
                    </div>
                  </div>
                ))}
                {criteria.length === 0 && (
                   <div className="p-8 text-center text-gray-500 font-inter">
                     No criteria configured for this round.
                   </div>
                )}
              </div>
              <div className="p-4 bg-primary/10 border-t border-primary/20 flex justify-between items-center">
                 <span className="font-mono text-sm text-primary uppercase">Total Possible Score</span>
                 <span className="font-bebas text-4xl text-white">{criteria.reduce((s,c) => s + c.maxScore, 0)}</span>
              </div>
            </Card>
          </div>
        )}

        {/* JUDGE PROGRESS TAB */}
        {activeTab === 'judges' && (
          <JudgeProgressView 
            assignments={assignments} 
            evaluations={evaluations} 
            activeRoundId={activeRoundId} 
            staffList={staffList}
          />
        )}

        {/* EVALUATIONS TAB */}
        {activeTab === 'evaluations' && (
          <EvaluationsListView 
            assignments={assignments}
            evaluations={evaluations}
            teams={teams}
            staffList={staffList}
            onManageTeam={(team) => setSelectedTeam(team)}
          />
        )}
      </div>

      {/* TEAM EVALUATIONS MODAL */}
      {selectedTeam && (
        <TeamEvaluationsModal
          isOpen={true}
          onClose={() => setSelectedTeam(null)}
          team={selectedTeam}
          assignments={assignments.filter(a => a.teamId === selectedTeam.id)}
          evaluations={evaluations.filter(e => e.teamId === selectedTeam.id)}
          staffList={staffList}
          onViewEvaluation={(evalDoc, assignment) => {
            if (evalDoc) {
              setSelectedEvaluation(evalDoc);
            } else {
              toastError('No Evaluation Yet', 'This judge has not started a draft yet.');
            }
          }}
        />
      )}

      {/* DETAIL MODAL */}
      {selectedEvaluation && (
        <EvaluationDetailModal
          isOpen={true}
          onClose={() => setSelectedEvaluation(null)}
          evaluation={selectedEvaluation}
          team={teams.find(t => t.id === selectedEvaluation.teamId) || { id: selectedEvaluation.teamId, name: 'Unknown Team' } as Team}
          criteria={criteria}
          onReopen={handleReopen}
          onCorrect={handleCorrect}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENTS
// ----------------------------------------------------------------------

function StatCard({ label, value, color = "text-white" }: { label: string, value: string | number, color?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center items-center text-center">
      <span className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">{label}</span>
      <span className={`font-bebas text-4xl tracking-widest ${color}`}>{value}</span>
    </div>
  );
}

function JudgeProgressView({ assignments, evaluations, activeRoundId, staffList }: any) {
  // Aggregate data per judge
  const judgeStats = useMemo(() => {
    const map = new Map<string, any>();
    
    // Initialize from assignments
    assignments.forEach((a: JudgeAssignment) => {
      if (!map.has(a.judgeId)) {
        map.set(a.judgeId, {
          judgeId: a.judgeId,
          assigned: 0,
          completed: 0,
          draft: 0,
          reopened: 0
        });
      }
      map.get(a.judgeId).assigned += 1;
    });

    // Add evaluation data
    evaluations.forEach((e: Evaluation) => {
      if (map.has(e.judgeId)) {
        const stats = map.get(e.judgeId);
        if (e.status === 'submitted' || e.locked) stats.completed += 1;
        else if (e.status === 'reopened') stats.reopened += 1;
        else stats.draft += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.completed - a.completed);
  }, [assignments, evaluations]);

  const columns: Column<any>[] = [
    { 
      header: 'Judge', 
      accessorKey: 'judgeId', 
      cell: r => {
        const staff = staffList?.find((s: any) => s.id === r.judgeId || s.uid === r.judgeId);
        return (
          <div>
            <div className="font-bebas text-lg text-white">{staff?.name || 'Unknown Judge'}</div>
            <div className="font-mono text-xs text-primary">{r.judgeId}</div>
          </div>
        );
      } 
    },
    { header: 'Assigned', accessorKey: 'assigned', cell: r => <span className="font-bebas text-xl">{r.assigned}</span> },
    { header: 'Completed', accessorKey: 'completed', cell: r => <span className="font-bebas text-xl text-green-500">{r.completed}</span> },
    { header: 'Draft/Reopened', accessorKey: 'draft', cell: r => <span className="font-bebas text-xl text-yellow-500">{r.draft + r.reopened}</span> },
    { header: 'Pending', accessorKey: 'pending', cell: r => <span className="font-bebas text-xl text-gray-500">{r.assigned - (r.completed + r.draft + r.reopened)}</span> },
    { 
      header: 'Progress', 
      accessorKey: 'progress', 
      cell: r => {
        const pct = r.assigned > 0 ? Math.round((r.completed / r.assigned) * 100) : 0;
        return (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/10 rounded-full w-24">
              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-xs">{pct}%</span>
          </div>
        );
      } 
    }
  ];

  if (judgeStats.length === 0) {
    return <EmptyState icon={Users} title="No Judges Assigned" description={`No judges have been assigned to teams for Round ${activeRoundId}.`} />
  }

  return (
    <Card className="p-0 border-white/10 bg-black/40">
      <DataTable columns={columns} data={judgeStats} />
    </Card>
  );
}

function EvaluationsListView({ assignments, evaluations, teams, staffList, onManageTeam }: any) {
  const [search, setSearch] = useState('');
  
  // Group by team
  const teamRows = useMemo(() => {
    const teamMap = new Map<string, any>();

    // Initialize all teams that have assignments
    assignments.forEach((a: JudgeAssignment) => {
      if (!teamMap.has(a.teamId)) {
        const team = teams.find((t: Team) => t.id === a.teamId);
        teamMap.set(a.teamId, {
          teamId: a.teamId,
          teamName: team?.name || 'Unknown Team',
          track: team?.track || 'Unknown',
          teamRef: team,
          totalAssigned: 0,
          completed: 0,
          draft: 0,
          reopened: 0,
          pending: 0
        });
      }
      const tr = teamMap.get(a.teamId);
      tr.totalAssigned += 1;
      
      const evaluation = evaluations.find((e: Evaluation) => e.teamId === a.teamId && e.judgeId === a.judgeId);
      if (evaluation) {
        if (evaluation.locked || evaluation.status === 'submitted') tr.completed += 1;
        else if (evaluation.status === 'reopened') tr.reopened += 1;
        else tr.draft += 1;
      } else {
        tr.pending += 1;
      }
    });

    return Array.from(teamMap.values());
  }, [assignments, evaluations, teams]);

  const filteredRows = useMemo(() => {
    return teamRows.filter((r: any) => {
      if (search) {
        const q = search.toLowerCase();
        return r.teamId.toLowerCase().includes(q) || 
               r.teamName.toLowerCase().includes(q);
      }
      return true;
    }).sort((a: any, b: any) => a.teamName.localeCompare(b.teamName));
  }, [teamRows, search]);

  const columns: Column<any>[] = [
    { 
      header: 'Team', 
      accessorKey: 'teamId', 
      cell: r => (
        <div>
          <div className="font-bebas text-lg text-white">{r.teamName}</div>
          <div className="font-mono text-xs text-gray-500">{r.teamId}</div>
        </div>
      ) 
    },
    { header: 'Track', accessorKey: 'track', cell: r => <Badge variant="outline" className="font-mono text-[10px]">{r.track}</Badge> },
    { 
      header: 'Judges Assigned', 
      accessorKey: 'totalAssigned', 
      cell: r => (
        <span className="font-mono text-primary text-sm flex items-center gap-2">
          <Users className="w-4 h-4" /> {r.totalAssigned}
        </span>
      ) 
    },
    { 
      header: 'Evaluation Status', 
      accessorKey: 'status', 
      cell: r => {
        const isFullyComplete = r.completed === r.totalAssigned && r.totalAssigned > 0;
        return (
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2">
                <span className={`font-bebas text-xl ${isFullyComplete ? 'text-green-500' : 'text-yellow-500'}`}>
                  {r.completed} <span className="text-gray-500 text-sm">/ {r.totalAssigned}</span>
                </span>
                {isFullyComplete ? <Badge variant="success">FINISHED</Badge> : <Badge variant="warning">IN PROGRESS</Badge>}
             </div>
             {r.reopened > 0 && <span className="text-[10px] text-orange-500 font-mono">{r.reopened} Reopened</span>}
          </div>
        );
      } 
    },
    { 
      header: 'Action', 
      accessorKey: 'actions', 
      cell: r => (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onManageTeam(r.teamRef)}
        >
          MANAGE EVALUATIONS
        </Button>
      ) 
    }
  ];

  return (
    <Card className="p-0 flex flex-col h-full border-white/10 bg-black/40">
      <div className="p-4 border-b border-white/10">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search teams..."
            className="w-full bg-black border border-white/20 rounded-lg pl-9 pr-4 py-2 text-white font-inter text-sm focus:outline-none focus:border-primary transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <DataTable columns={columns} data={filteredRows} emptyMessage="No teams match the search." />
    </Card>
  );
}

// ----------------------------------------------------------------------
// TEAM EVALUATIONS MODAL
// ----------------------------------------------------------------------
import { Modal } from '../../../components/ui/Modal';

function TeamEvaluationsModal({ isOpen, onClose, team, assignments, evaluations, staffList, onViewEvaluation }: any) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="3xl" title={`Evaluations: ${team.name}`}>
      <div className="space-y-4">
        <p className="text-sm text-gray-400 font-inter mb-4">
          Below are all the judges assigned to this team and their scorecard status.
        </p>

        {assignments.length === 0 ? (
          <div className="p-8 text-center bg-white/5 border border-white/10 rounded-xl text-gray-500 font-inter">
            No judges assigned to this team.
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((a: JudgeAssignment) => {
              const evaluation = evaluations.find((e: Evaluation) => e.judgeId === a.judgeId);
              
              let status = 'PENDING';
              if (evaluation) {
                if (evaluation.locked || evaluation.status === 'submitted') status = 'COMPLETED';
                else if (evaluation.status === 'reopened') status = 'REOPENED';
                else status = 'DRAFT';
              }

              return (
                <div key={a.id} className="flex justify-between items-center p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-2 rounded-lg text-primary">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bebas text-white text-lg">{staffList?.find((s: any) => s.id === a.judgeId || s.uid === a.judgeId)?.name || 'Unknown Judge'}</div>
                      <div className="font-mono text-gray-500 text-xs">{a.judgeId}</div>
                      <div className="mt-1">
                        {status === 'COMPLETED' && <Badge variant="success">COMPLETED</Badge>}
                        {status === 'REOPENED' && <Badge variant="warning">REOPENED</Badge>}
                        {status === 'DRAFT' && <Badge variant="warning" className="opacity-70">DRAFT</Badge>}
                        {status === 'PENDING' && <Badge variant="outline" className="text-gray-500">PENDING</Badge>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <div className="font-mono text-xs text-gray-500">Score</div>
                      <div className="font-bebas text-2xl text-white">{evaluation ? evaluation.totalScore : '—'}</div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewEvaluation(evaluation, a)}
                      disabled={!evaluation}
                    >
                      VIEW SCORECARD
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
