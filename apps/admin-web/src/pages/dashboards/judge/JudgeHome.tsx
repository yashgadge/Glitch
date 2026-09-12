import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Users, CheckSquare, Bell, ArrowRight, Clock, Activity, FileText } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { ParticipantService } from '@shared/services/ParticipantService';
import { TeamService } from '@shared/services/TeamService';
import { EvaluationService } from '@shared/services/EvaluationService';
import { AnnouncementService } from '@shared/services/AnnouncementService';
import { RoundService } from '@shared/services/RoundService';
import { SubmissionService } from '@shared/services/SubmissionService';
import type { Staff, Team, Announcement, Round, JudgeAssignment, Evaluation, Submission } from '@shared/types/models';

interface TeamTileData {
  team: Team;
  submissionStatus: string;
  evaluationStatus: 'pending' | 'draft' | 'completed' | 'reopened';
}

export default function JudgeHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Staff | null>(null);
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  const [teamsData, setTeamsData] = useState<TeamTileData[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    let unsubAssignments: () => void;
    let unsubEvals: () => void;
    let unsubAnnouncements: () => void;
    
    const fetchInitial = async () => {
      const staff = await ParticipantService.getStaffProfile(user.uid);
      setProfile(staff);
      
      const rounds = await RoundService.getAllRounds();
      const currentRound = rounds.find(r => r.status === 'EVALUATION_OPEN') || rounds[0];
      setActiveRound(currentRound || null);

      if (currentRound) {
        unsubAssignments = EvaluationService.subscribeToJudgeAssignments(user.uid, Number(currentRound.id), async (judgeAssignments) => {
          setAssignments(judgeAssignments);
          if (judgeAssignments.length === 0) {
            setTeamsData([]);
            setLoading(false);
            return;
          }
          
          const tilesPromises = judgeAssignments.map(async (assignment) => {
            const team = await TeamService.getTeam(assignment.teamId);
            if (!team) return null;
            const submission = await new Promise<Submission | null>((resolve) => {
              const unsub = SubmissionService.subscribeToTeamSubmission(team.id, Number(currentRound.id), (sub) => {
                unsub();
                resolve(sub);
              });
            });
            return {
              team,
              submissionStatus: submission?.status || 'pending',
              evaluationStatus: 'pending' as const
            };
          });
          
          const resolvedTiles = (await Promise.all(tilesPromises)).filter(Boolean) as TeamTileData[];
          setTeamsData(resolvedTiles);
        });

        unsubEvals = EvaluationService.subscribeToJudgeEvaluations(user.uid, (evals) => {
          setEvaluations(evals.filter(e => e.roundId === Number(currentRound.id)));
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
      
      unsubAnnouncements = AnnouncementService.subscribeToAnnouncements('judge', (anns) => {
        setAnnouncements(anns.slice(0, 3)); 
      });
    };
    
    fetchInitial();
    
    return () => {
      if (unsubAssignments) unsubAssignments();
      if (unsubEvals) unsubEvals();
      if (unsubAnnouncements) unsubAnnouncements();
    };
  }, [user]);

  const combinedData = useMemo(() => {
    return teamsData.map(td => {
      const evalData = evaluations.find(e => e.teamId === td.team.id);
      let eStatus: TeamTileData['evaluationStatus'] = 'pending';
      if (evalData) {
        if (evalData.status === 'draft') eStatus = 'draft';
        else if (evalData.status === 'locked' || evalData.status === 'submitted') eStatus = 'completed';
        // Assume reopened if somehow it's marked but logic could be added if Reopened state exists in model
      }
      return { ...td, evaluationStatus: eStatus, evalData };
    });
  }, [teamsData, evaluations]);

  if (!profile || loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  const completedCount = combinedData.filter(d => d.evaluationStatus === 'completed').length;
  const draftCount = combinedData.filter(d => d.evaluationStatus === 'draft').length;
  const pendingCount = combinedData.filter(d => d.evaluationStatus === 'pending').length;
  
  const progressPercent = combinedData.length > 0 ? Math.round((completedCount / combinedData.length) * 100) : 0;
  
  // Find next action
  const nextTeamData = combinedData.find(d => d.evaluationStatus === 'pending' || d.evaluationStatus === 'draft');
  const recentActivity = [...combinedData].filter(d => d.evaluationStatus === 'completed' || d.evaluationStatus === 'draft')
    .sort((a, b) => {
      const tA = a.evalData?.timestamp ? new Date(a.evalData.timestamp).getTime() : 0;
      const tB = b.evalData?.timestamp ? new Date(b.evalData.timestamp).getTime() : 0;
      return tB - tA;
    }).slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white">JUDGE DASHBOARD</h2>
          <p className="font-inter text-gray-400">Welcome, {profile.name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-inter text-gray-400 mb-2">{activeRound ? `Round ${activeRound.id} — ${activeRound.displayName}` : 'WAITING FOR ROUND'}</p>
          <div className="flex items-center gap-2 justify-end">
            {activeRound?.evaluationMode && (
              <Badge variant={activeRound.evaluationMode === 'LIVE' ? 'warning' : 'default'} className="text-xs font-mono">
                {activeRound.evaluationMode === 'LIVE' ? '🎙 LIVE JUDGING' : 
                 activeRound.evaluationMode === 'BOTH' ? '📋 SUBMISSION + LIVE' : '💻 DIGITAL SUBMISSION'}
              </Badge>
            )}
            <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-mono border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              AVAILABLE
            </div>
          </div>
        </div>
      </div>

      {activeRound?.evaluationMode === 'LIVE' && (
        <Card className="p-6 border-red-500/50 bg-red-500/10 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-bebas text-2xl tracking-widest text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              LIVE JUDGING IN PROGRESS
            </h3>
            <p className="text-gray-400 font-inter text-sm mt-1">
              This round requires live evaluation. Enter the Live Dashboard to score teams.
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/workspace/live')}>
            ENTER LIVE DASHBOARD <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Progress & Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 flex flex-col justify-center border-l-2 border-gray-500">
              <p className="text-[10px] font-mono text-gray-400 uppercase">Assigned</p>
              <h3 className="text-2xl font-bebas text-white tracking-wider">{combinedData.length}</h3>
            </Card>
            <Card className="p-4 flex flex-col justify-center border-l-2 border-yellow-500 bg-yellow-500/5">
              <p className="text-[10px] font-mono text-yellow-500 uppercase">Pending</p>
              <h3 className="text-2xl font-bebas text-white tracking-wider">{pendingCount}</h3>
            </Card>
            <Card className="p-4 flex flex-col justify-center border-l-2 border-blue-500 bg-blue-500/5">
              <p className="text-[10px] font-mono text-blue-500 uppercase">Drafts</p>
              <h3 className="text-2xl font-bebas text-white tracking-wider">{draftCount}</h3>
            </Card>
            <Card className="p-4 flex flex-col justify-center border-l-2 border-green-500 bg-green-500/5">
              <p className="text-[10px] font-mono text-green-500 uppercase">Completed</p>
              <h3 className="text-2xl font-bebas text-white tracking-wider">{completedCount}</h3>
            </Card>
          </div>
          
          <Card className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-inter font-medium text-white text-sm uppercase tracking-wider">My Progress</h3>
              <span className="font-mono text-primary text-sm">{completedCount} / {combinedData.length} Teams</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-3 mb-1 overflow-hidden border border-white/10">
              <div className="bg-primary h-3 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </Card>

          {/* Current / Next Team */}
          <div>
            <h3 className="font-bebas text-2xl text-white tracking-widest mb-4 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" /> CURRENT / NEXT TEAM
            </h3>
            
            {nextTeamData ? (
              <Card className="p-0 overflow-hidden border-primary/30 relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{nextTeamData.team.id}</span>
                      <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">{nextTeamData.team.track}</span>
                    </div>
                    <h3 className="font-bebas text-3xl text-white tracking-wide">{nextTeamData.team.name}</h3>
                    
                    <div className="flex gap-4 mt-3">
                      {activeRound?.evaluationMode !== 'LIVE' && (
                        <div className="flex flex-col">
                          <span className="text-[10px] font-inter text-gray-500 uppercase">Submission</span>
                          <span className="text-xs font-mono text-gray-300 mt-1">{nextTeamData.submissionStatus.toUpperCase()}</span>
                        </div>
                      )}
                      
                      <div className="flex flex-col">
                        <span className="text-[10px] font-inter text-gray-500 uppercase">Evaluation</span>
                        <span className={`text-xs font-mono mt-1 ${nextTeamData.evaluationStatus === 'draft' ? 'text-yellow-500' : 'text-gray-400'}`}>
                          {nextTeamData.evaluationStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="primary" 
                    className="font-bebas tracking-widest text-lg w-full md:w-auto px-8 py-6"
                    onClick={() => navigate(`/workspace/teams/${nextTeamData.team.id}?roundId=${activeRound.id}`)}
                  >
                    OPEN TEAM <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </Card>
            ) : combinedData.length > 0 ? (
              <Card className="p-8 text-center border-green-500/20 bg-green-500/5">
                <CheckSquare className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <h3 className="font-bebas text-2xl text-white tracking-wide">ALL EVALUATIONS COMPLETE</h3>
                <p className="text-gray-400 font-inter text-sm mt-1">You have evaluated all assigned teams for this round.</p>
              </Card>
            ) : (
              <Card className="p-8 text-center border-white/5">
                <Users className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                <h3 className="font-bebas text-xl text-white tracking-wide">NO TEAMS ASSIGNED</h3>
                <p className="text-gray-400 font-inter text-sm mt-1">Your assignments will appear here when the organizer allocates projects to you.</p>
              </Card>
            )}
          </div>

        </div>

        {/* Right Column - Sidebars */}
        <div className="space-y-6">
          
          {/* Recent Activity */}
          <div>
            <h3 className="font-bebas text-xl text-white tracking-widest mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> RECENT ACTIVITY
            </h3>
            <Card className="p-0 overflow-hidden bg-black/40">
              {recentActivity.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {recentActivity.map(d => (
                    <div key={d.team.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer" onClick={() => navigate(`/workspace/evaluations`)}>
                      <div className="flex items-center gap-3">
                        {d.evaluationStatus === 'completed' ? (
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        )}
                        <div>
                          <p className="text-sm font-inter text-white">{d.team.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">
                            {d.evaluationStatus === 'completed' ? 'EVALUATED' : 'DRAFT SAVED'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{d.evalData?.totalScore || 0}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500 font-inter text-sm">
                  No recent activity to display.
                </div>
              )}
            </Card>
          </div>

          {/* Announcements */}
          <div>
            <h3 className="font-bebas text-xl text-white tracking-widest mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-yellow-500" /> ANNOUNCEMENTS
            </h3>
            <Card className="p-0 overflow-hidden border-yellow-500/20 bg-black/40">
              {announcements.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {announcements.map(ann => (
                    <div key={ann.id} className="p-4 hover:bg-white/5 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium text-white font-inter">{ann.title}</span>
                        <span className="text-[10px] text-gray-500 font-mono flex items-center">
                          <Clock className="w-3 h-3 mr-1"/>
                          {new Date(ann.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-inter line-clamp-2 mt-1">{ann.content}</p>
                    </div>
                  ))}
                  <button 
                    className="w-full p-3 text-xs font-mono text-gray-400 hover:text-white bg-black/20 hover:bg-black/40 transition-colors"
                    onClick={() => navigate('/workspace/announcements')}
                  >
                    VIEW ALL
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500 font-inter text-sm">
                  No recent announcements.
                </div>
              )}
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
}
