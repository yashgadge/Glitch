import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Users, Search, ArrowRight, Edit3, SearchX, MapPin, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { TeamService } from '@shared/services/TeamService';
import { EvaluationService } from '@shared/services/EvaluationService';
import { RoundService } from '@shared/services/RoundService';
import { SubmissionService } from '@shared/services/SubmissionService';
import { ParticipantService } from '@shared/services/ParticipantService';
import type { Team, Round, JudgeAssignment, Evaluation, Submission } from '@shared/types/models';
import { TeamDetailsModal } from '../../../components/admin/TeamDetailsModal';

interface TeamTileData {
  team: Team;
  leaderName: string;
  college: string;
  projectName: string;
  track: string;
  submissionStatus: string;
  status: 'pending' | 'draft' | 'completed';
  isEliminated: boolean;
  isDisqualified: boolean;
}

export default function JudgeTeams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  const [tiles, setTiles] = useState<TeamTileData[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showEliminated, setShowEliminated] = useState(false);
  const [showDisqualified, setShowDisqualified] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (!user) return;
    
    let unsubAssignments: () => void;
    let unsubEvals: () => void;
    
    const fetchInitial = async () => {
      const rounds = await RoundService.getAllRounds();
      const currentRound = rounds.find(r => r.status === 'EVALUATION_OPEN') || rounds[0];
      setActiveRound(currentRound || null);

      if (currentRound) {
        unsubAssignments = EvaluationService.subscribeToJudgeAssignments(user.uid, Number(currentRound.id), async (judgeAssignments) => {
          setAssignments(judgeAssignments);
          if (judgeAssignments.length === 0) {
            setTiles([]);
            setLoading(false);
            return;
          }

          const tilePromises = judgeAssignments.map(async (assignment) => {
            const team = await TeamService.getTeam(assignment.teamId);
            if (!team) return null;
            let leader = null;
            if (team.leaderId) {
              leader = await ParticipantService.getParticipantByUid(team.leaderId);
            }
            
            const submission = await new Promise<Submission | null>((resolve) => {
               const unsub = SubmissionService.subscribeToTeamSubmission(team.id, Number(currentRound.id), (sub) => {
                 unsub();
                 resolve(sub);
               });
            });
            
            let projectName = 'Unnamed Project';
            if (submission) {
              const version = await SubmissionService.getLatestVersion(submission.id, submission.currentVersion || 1);
              if (version && version.fields) {
                projectName = version.fields['name'] || version.fields['project_name'] || version.fields['title'] || version.fields['Idea Title'] || 'Unnamed Project';
              }
            }
            
            return {
              team,
              leaderName: leader?.name || 'Unknown',
              college: leader?.college || 'Unknown',
              projectName,
              track: team.track,
              submissionStatus: submission ? submission.status : 'pending',
              status: 'pending' as const,
              isEliminated: !!team.eliminated,
              isDisqualified: !!team.disqualified
            };
          });
          
          const resolvedTiles = (await Promise.all(tilePromises)).filter(Boolean) as TeamTileData[];
          
          // Subscribe to evaluations for these teams to update status
          if (unsubEvals) unsubEvals();
          unsubEvals = EvaluationService.subscribeToJudgeEvaluations(user.uid, (evals) => {
            setTiles(resolvedTiles.map(t => {
              const teamEval = evals.find(e => e.teamId === t.team.id && e.roundId === Number(currentRound.id));
              let status: 'pending' | 'draft' | 'completed' = 'pending';
              if (teamEval) {
                if (teamEval.status === 'draft') status = 'draft';
                if (teamEval.status === 'submitted' || teamEval.status === 'locked') status = 'completed';
              }
              return { ...t, status };
            }));
            setLoading(false);
          });
        });
      } else {
        setLoading(false);
      }
    };
    
    fetchInitial();
    
    return () => {
      if (unsubAssignments) unsubAssignments();
      if (unsubEvals) unsubEvals();
    };
  }, [user]);

  const filteredTiles = useMemo(() => {
    return tiles
      .filter(t => {
        if (!showEliminated && t.isEliminated) return false;
        if (!showDisqualified && t.isDisqualified) return false;
        
        const q = search.toLowerCase();
        return (
          t.team.name.toLowerCase().includes(q) ||
          t.projectName.toLowerCase().includes(q) ||
          t.leaderName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.team.name.localeCompare(b.team.name));
  }, [tiles, search, showEliminated, showDisqualified]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!activeRound || assignments.length === 0) {
    return (
      <div className="max-w-3xl mx-auto pt-20">
        <div className="flex flex-col items-center justify-center p-12 text-center bg-black/40 border border-white/10 rounded-2xl">
          <Users className="w-16 h-16 text-gray-500 mb-6" />
          <h2 className="text-2xl font-bebas tracking-wider text-white mb-2">No Teams Assigned</h2>
          <p className="text-gray-400 font-inter max-w-md">You do not have any teams assigned to you for evaluation in the current active round.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" /> TEAMS
          </h2>
          <p className="font-inter text-gray-400">Assigned Teams | Round {activeRound.id}</p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search teams, projects..."
            className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white font-inter text-sm focus:outline-none focus:border-primary transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex gap-4 items-center">
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input type="checkbox" checked={showEliminated} onChange={(e) => setShowEliminated(e.target.checked)} className="accent-orange-500" />
          Show Eliminated
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input type="checkbox" checked={showDisqualified} onChange={(e) => setShowDisqualified(e.target.checked)} className="accent-red-500" />
          Show Disqualified
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTiles.map(tile => (
          <Card 
            key={tile.team.id} 
            className={`p-0 overflow-hidden cursor-pointer transition-all hover:border-primary/50 group ${tile.status === 'completed' ? 'opacity-70 bg-black/60' : ''}`}
            onClick={() => setSelectedTeam(tile.team)}
          >
            <div className="flex border-b border-white/5">
              <div className="bg-primary/20 p-4 flex flex-col items-center justify-center min-w-[80px] border-r border-white/5">
                <span className="text-xs font-inter text-primary">TEAM</span>
                <span className="text-xl font-bebas text-white truncate max-w-[60px]">{tile.team.id}</span>
              </div>
              <div className="p-4 flex-1">
                <h3 className="font-bebas text-xl text-white tracking-wide group-hover:text-primary transition-colors">{tile.team?.name || 'Unnamed Team'}</h3>
                <p className="text-sm font-inter text-gray-400 truncate mb-1">{tile.projectName}</p>
                <div className="flex gap-2">
                  <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{tile.team?.track || 'Unassigned'}</span>
                  {tile.isEliminated && <span className="text-[10px] font-mono text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">ELIMINATED</span>}
                  {tile.isDisqualified && <span className="text-[10px] font-mono text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">DISQUALIFIED</span>}
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-black/20 flex flex-col gap-2 text-sm font-inter">
              <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2 mb-1">
                <span className="text-gray-500">Presentation</span>
                {tile.team.presentationStatus === 'READY' || tile.team.presentationStatus === 'PRESENTING' ? (
                  <span className="text-green-400 font-mono bg-green-500/10 px-1.5 py-0.5 rounded">{tile.team.presentationStatus}</span>
                ) : tile.team.presentationStatus === 'COMPLETED' ? (
                  <span className="text-gray-400 font-mono bg-gray-500/10 px-1.5 py-0.5 rounded">{tile.team.presentationStatus}</span>
                ) : (
                  <span className="text-yellow-500 font-mono bg-yellow-500/10 px-1.5 py-0.5 rounded">{tile.team.presentationStatus || 'WAITING'}</span>
                )}
              </div>
              <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2 mb-1">
                <span className="text-gray-500">Submission</span>
                {tile.submissionStatus === 'locked' || tile.submissionStatus === 'submitted' ? (
                  <span className="text-green-500 font-mono">✓ SUBMITTED</span>
                ) : (
                  <span className="text-yellow-500 font-mono">PENDING</span>
                )}
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Evaluation</span>
                {tile.status === 'completed' && <span className="flex items-center text-green-500 font-mono bg-green-500/10 px-1.5 py-0.5 rounded"><CheckCircle className="w-3 h-3 mr-1" /> EVALUATED</span>}
                {tile.status === 'draft' && <span className="flex items-center text-yellow-500 font-mono bg-yellow-500/10 px-1.5 py-0.5 rounded"><Clock className="w-3 h-3 mr-1" /> DRAFT</span>}
                {tile.status === 'pending' && <span className="text-gray-500 font-mono bg-white/5 px-1.5 py-0.5 rounded">PENDING</span>}
              </div>
              <Button 
                variant={tile.status === 'completed' ? 'outline' : 'primary'} 
                size="sm" 
                className="w-full mt-2 h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/workspace/teams/${tile.team.id}?roundId=${activeRound.id}`);
                }}
              >
                {tile.status === 'completed' ? 'Review Evaluation' : tile.status === 'draft' ? 'Continue Evaluation' : 'Evaluate Now'}
              </Button>
            </div>
          </Card>
        ))}
        {filteredTiles.length === 0 && (
          <div className="col-span-full">
            <div className="flex flex-col items-center justify-center p-12 text-center bg-black/40 border border-white/10 rounded-2xl">
              <SearchX className="w-16 h-16 text-gray-500 mb-6" />
              <h2 className="text-2xl font-bebas tracking-wider text-white mb-2">No Teams Found</h2>
              <p className="text-gray-400 font-inter">Try adjusting your search criteria.</p>
            </div>
          </div>
        )}
      </div>

      <TeamDetailsModal 
        isOpen={!!selectedTeam} 
        onClose={() => setSelectedTeam(null)} 
        team={selectedTeam} 
      />
    </div>
  );
}
