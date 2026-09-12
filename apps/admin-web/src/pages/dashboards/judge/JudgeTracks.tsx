import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { BookOpen, Users, ChevronDown, ChevronRight, CheckSquare, Clock } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { TrackService } from '@shared/services/TrackService';
import { EvaluationService } from '@shared/services/EvaluationService';
import { TeamService } from '@shared/services/TeamService';
import { RoundService } from '@shared/services/RoundService';
import { SubmissionService } from '@shared/services/SubmissionService';
import type { Track, Team, JudgeAssignment, Round, Submission, Evaluation } from '@shared/types/models';

export default function JudgeTracks() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedTracks, setExpandedTracks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;

    let unsubTracks: () => void;
    let unsubAssignments: () => void;
    let unsubTeams: () => void;
    let unsubSubmissions: () => void;
    let unsubEvaluations: () => void;

    const init = async () => {
      const fetchedRounds = await RoundService.getAllRounds();
      setRounds(fetchedRounds);

      unsubTracks = TrackService.subscribeToTracks(setTracks);
      unsubAssignments = EvaluationService.subscribeToAllJudgeAssignments(user.uid, setAssignments);
      unsubTeams = TeamService.subscribeToAllTeams(setTeams);
      unsubSubmissions = SubmissionService.subscribeToAllSubmissions(setSubmissions);
      unsubEvaluations = EvaluationService.subscribeToJudgeEvaluations(user.uid, setEvaluations);
      
      setLoading(false);
    };

    init();

    return () => {
      if (unsubTracks) unsubTracks();
      if (unsubAssignments) unsubAssignments();
      if (unsubTeams) unsubTeams();
      if (unsubSubmissions) unsubSubmissions();
      if (unsubEvaluations) unsubEvaluations();
    };
  }, [user]);

  // Group teams by track, then by round based on judge assignments
  const tracksData = useMemo(() => {
    return tracks.map(track => {
      const trackTeams = teams.filter(t => t.trackId === track.id || t.track === track.name);
      
      // We only care about teams that this judge is assigned to in AT LEAST ONE round
      const assignedTrackTeams = trackTeams.filter(team => 
        assignments.some(a => a.teamId === team.id)
      );

      // Map teams and find which rounds they are assigned to
      const teamsWithRounds = assignedTrackTeams.map(team => {
        const teamAssignments = assignments.filter(a => a.teamId === team.id);
        const activeRoundsForTeam = teamAssignments.map(a => {
          const round = rounds.find(r => Number(r.id) === a.roundId);
          const sub = submissions.find(s => s.teamId === team.id && s.roundId === a.roundId);
          const ev = evaluations.find(e => e.teamId === team.id && e.roundId === a.roundId);
          
          return {
            roundId: a.roundId,
            roundName: round?.displayName || `Round ${a.roundId}`,
            isOpen: round?.status.includes('OPEN'),
            submissionStatus: sub?.status || 'pending',
            evaluationStatus: ev ? ev.status : 'pending'
          };
        });

        return {
          ...team,
          rounds: activeRoundsForTeam.sort((a, b) => a.roundId - b.roundId)
        };
      });

      return {
        ...track,
        teams: teamsWithRounds
      };
    });
  }, [tracks, teams, assignments, rounds, submissions, evaluations]);

  const toggleTrack = (trackId: string) => {
    setExpandedTracks(prev => ({
      ...prev,
      [trackId]: !prev[trackId]
    }));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto">
      <div>
        <h1 className="font-bebas text-4xl tracking-widest text-white mb-2">TRACKS & TEAMS</h1>
        <p className="font-inter text-gray-400">View your assigned teams categorized by their track and evaluate them round-wise.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {tracksData.map(track => {
          const isExpanded = expandedTracks[track.id];
          const hasTeams = track.teams.length > 0;
          
          return (
            <Card key={track.id} className="border-white/10 bg-black/40 overflow-hidden transition-all duration-300">
              <div 
                className={`p-6 flex justify-between items-center cursor-pointer transition-colors ${isExpanded ? 'bg-primary/5 border-b border-primary/20' : 'hover:bg-white/5'}`}
                onClick={() => toggleTrack(track.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center border transition-colors ${isExpanded ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/10'}`}>
                    <BookOpen className={`w-6 h-6 ${isExpanded ? 'text-primary' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h2 className="font-bebas text-3xl text-white tracking-widest">{track.name}</h2>
                    <p className="text-gray-400 font-inter text-sm flex items-center gap-3">
                      <span>{track.teams.length} Assigned Teams</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {isExpanded ? <ChevronDown className="text-primary w-6 h-6" /> : <ChevronRight className="text-gray-500 w-6 h-6" />}
                </div>
              </div>

              {isExpanded && (
                <div className="p-6 bg-black/60">
                  {!hasTeams ? (
                    <div className="text-center py-8 border border-dashed border-white/10 rounded-lg">
                      <Users className="w-8 h-8 text-gray-500 mx-auto mb-3 opacity-50" />
                      <h3 className="font-bebas text-xl text-gray-400 tracking-wider">NO TEAMS ASSIGNED</h3>
                      <p className="text-gray-500 font-inter text-sm mt-1">You have no team assignments in this track yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {track.teams.map(team => (
                        <div key={team.id} className="bg-white/5 border border-white/10 rounded-lg p-5">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <h3 className="font-bebas text-2xl text-white tracking-wider">{team.name}</h3>
                              <span className="text-xs font-mono text-gray-400">TEAM ID: {team.id}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {team.rounds.map(r => (
                              <div key={r.roundId} className="bg-black/40 border border-white/5 rounded-lg p-4 flex flex-col justify-between">
                                <div className="mb-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bebas text-lg text-primary">{r.roundName}</h4>
                                    {!r.isOpen && <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/10">CLOSED</span>}
                                  </div>
                                  
                                  <div className="space-y-2 text-sm font-inter">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Submission:</span>
                                      <span className="text-gray-300 font-mono text-xs uppercase">{r.submissionStatus}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Evaluation:</span>
                                      <span className={`font-mono text-xs uppercase ${r.evaluationStatus === 'draft' ? 'text-yellow-500' : r.evaluationStatus === 'completed' || r.evaluationStatus === 'submitted' ? 'text-green-500' : 'text-gray-400'}`}>
                                        {r.evaluationStatus}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full font-bebas tracking-widest"
                                  onClick={() => navigate(`/workspace/teams/${team.id}?roundId=${r.roundId}`)}
                                >
                                  {r.evaluationStatus === 'completed' || r.evaluationStatus === 'submitted' ? 'VIEW EVALUATION' : 'EVALUATE'}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {tracks.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-lg">
            <h3 className="font-bebas text-2xl text-gray-500 tracking-wider mb-2">NO TRACKS AVAILABLE</h3>
            <p className="font-inter text-gray-600 text-sm">Tracks will appear here once configured by the admin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
