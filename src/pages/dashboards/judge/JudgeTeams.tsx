import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';

import { Search, Users, MapPin, CheckCircle, Clock } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useAuth } from '../../../contexts/AuthContext';
import { ParticipantService } from '../../../services/ParticipantService';
import { ClassroomService } from '../../../services/ClassroomService';
import { TeamService } from '../../../services/TeamService';
import { EvaluationService } from '../../../services/EvaluationService';
import { SubmissionService } from '../../../services/SubmissionService';
import type { Staff, Team, Classroom, Submission } from '../../../types/models';

interface TeamTileData {
  team: Team;
  seatId: string;
  leaderName: string;
  projectName: string;
  track: string;
  college: string;
  submissionStatus: 'pending' | 'submitted' | 'locked';
  status: 'pending' | 'draft' | 'completed';
  isEliminated: boolean;
  isDisqualified: boolean;
}

export default function JudgeTeams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Staff | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [tiles, setTiles] = useState<TeamTileData[]>([]);
  const [search, setSearch] = useState('');
  const [showEliminated, setShowEliminated] = useState(false);
  const [showDisqualified, setShowDisqualified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    let unsubClassroom: () => void;
    let unsubEvals: () => void;
    
    const fetchInitial = async () => {
      const staff = await ParticipantService.getStaffProfile(user.uid);
      setProfile(staff);
      
      if (staff?.assignedClassroom) {
        unsubClassroom = ClassroomService.subscribeToClassroom(staff.assignedClassroom, async (cr) => {
          setClassroom(cr);
          if (cr) {
            const currentRound = cr.currentRound;
            const validEntries = cr.seatingPlan.filter(s => s.teamId);
            
            // Fetch teams, leaders, submissions
            const tilePromises = validEntries.map(async (entry) => {
              const team = await TeamService.getTeam(entry.teamId!);
              if (!team) return null;
              
              const leader = await ParticipantService.getParticipantProfile(team.leaderId);
              const submission = await new Promise<Submission | null>((resolve) => {
                 const unsub = SubmissionService.subscribeToTeamSubmission(team.id, (sub) => {
                   unsub();
                   resolve(sub);
                 });
              });
              
              const projectName = submission?.fields['name'] || submission?.fields['project_name'] || submission?.fields['title'] || 'Unnamed Project';
              
              return {
                team,
                seatId: entry.seatId,
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
            unsubEvals = EvaluationService.subscribeToJudgeEvaluations(user.uid, (evals) => {
              setTiles(resolvedTiles.map(t => {
                const teamEval = evals.find(e => e.teamId === t.team.id && e.roundId === currentRound);
                let status: 'pending' | 'draft' | 'completed' = 'pending';
                if (teamEval) {
                  if (teamEval.status === 'draft') status = 'draft';
                  if (teamEval.status === 'submitted' || teamEval.status === 'locked') status = 'completed';
                }
                return { ...t, status };
              }));
              setLoading(false);
            });
          } else {
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    };
    
    fetchInitial();
    
    return () => {
      if (unsubClassroom) unsubClassroom();
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
          t.seatId.toLowerCase().includes(q) ||
          t.leaderName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.seatId.localeCompare(b.seatId, undefined, { numeric: true }));
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

  if (!profile?.assignedClassroom || !classroom) {
    return (
      <div className="max-w-3xl mx-auto pt-20">
        <EmptyState 
          icon={MapPin}
          title="No Classroom Assigned"
          description="Contact an organizer to assign you to a classroom."
        />
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
          <p className="font-inter text-gray-400">Classroom {classroom.id} | Round {classroom.currentRound}</p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search teams, projects, seats..."
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
            onClick={() => navigate(`/workspace/teams/${tile.team.id}`)}
          >
            <div className="flex border-b border-white/5">
              <div className="bg-primary/20 p-4 flex flex-col items-center justify-center min-w-[80px] border-r border-white/5">
                <span className="text-xs font-inter text-primary">SEAT</span>
                <span className="text-2xl font-bebas text-white">{tile.seatId}</span>
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
                <span className="text-gray-500">Submission</span>
                {tile.submissionStatus === 'locked' || tile.submissionStatus === 'submitted' ? (
                  <span className="text-green-500 font-mono">✓ SUBMITTED</span>
                ) : (
                  <span className="text-yellow-500 font-mono">PENDING</span>
                )}
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Evaluation</span>
                {tile.status === 'completed' && <span className="flex items-center text-green-500 font-mono"><CheckCircle className="w-3 h-3 mr-1" /> EVALUATED</span>}
                {tile.status === 'draft' && <span className="flex items-center text-yellow-500 font-mono"><Clock className="w-3 h-3 mr-1" /> DRAFT</span>}
                {tile.status === 'pending' && <span className="text-gray-500 font-mono">PENDING</span>}
              </div>
            </div>
          </Card>
        ))}
        {filteredTiles.length === 0 && (
          <div className="col-span-full">
            <EmptyState 
              icon={Users}
              title="No Teams Found"
              description="Try adjusting your search criteria."
            />
          </div>
        )}
      </div>
    </div>
  );
}
