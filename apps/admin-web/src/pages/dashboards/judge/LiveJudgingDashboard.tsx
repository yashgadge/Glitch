import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Users, CheckCircle, Save, AlertTriangle, ArrowRight, User, Search } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { ParticipantService } from '@shared/services/ParticipantService';
import { TeamService } from '@shared/services/TeamService';
import { EvaluationService } from '@shared/services/EvaluationService';
import { RoundService } from '@shared/services/RoundService';
import { SubmissionService } from '@shared/services/SubmissionService';
import type { Staff, Team, Round, JudgeAssignment, Evaluation, Submission } from '@shared/types/models';

interface TeamTileData {
  team: Team;
  submissionStatus: string;
  evaluationStatus: 'pending' | 'draft' | 'completed' | 'reopened';
  evalData?: Evaluation;
}

export default function LiveJudgingDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Staff | null>(null);
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [teamsData, setTeamsData] = useState<TeamTileData[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Team State
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [localEvalStatus, setLocalEvalStatus] = useState<'draft' | 'submitted'>('draft');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    
    let unsubAssignments: () => void;
    let unsubEvals: () => void;
    
    const fetchInitial = async () => {
      const staff = await ParticipantService.getStaffProfile(user.uid);
      setProfile(staff);
      
      const rounds = await RoundService.getAllRounds();
      const currentRound = rounds.find(r => r.status === 'EVALUATION_OPEN' && r.evaluationMode === 'LIVE') || null;
      setActiveRound(currentRound);

      if (currentRound) {
        unsubAssignments = EvaluationService.subscribeToJudgeAssignments(user.uid, Number(currentRound.id), async (judgeAssignments) => {
          if (judgeAssignments.length === 0) {
            setTeamsData([]);
            setLoading(false);
            return;
          }
          
          const tilesPromises = judgeAssignments.map(async (assignment) => {
            const team = await TeamService.getTeam(assignment.teamId);
            if (!team) return null;
            // For live judging, we don't strictly need submission status, but we fetch it anyway to keep data models consistent
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
    };
    
    fetchInitial();
    
    return () => {
      if (unsubAssignments) unsubAssignments();
      if (unsubEvals) unsubEvals();
    };
  }, [user]);

  const combinedData = useMemo(() => {
    return teamsData.map(td => {
      const evalData = evaluations.find(e => e.teamId === td.team.id);
      let eStatus: TeamTileData['evaluationStatus'] = 'pending';
      if (evalData) {
        if (evalData.status === 'draft') eStatus = 'draft';
        else if (evalData.status === 'locked' || evalData.status === 'submitted') eStatus = 'completed';
      }
      return { ...td, evaluationStatus: eStatus, evalData };
    });
  }, [teamsData, evaluations]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return combinedData;
    const q = searchQuery.toLowerCase();
    return combinedData.filter(d => 
      d.team.name.toLowerCase().includes(q) || 
      d.team.id.toLowerCase().includes(q) || 
      (d.team.track && d.team.track.toLowerCase().includes(q))
    );
  }, [combinedData, searchQuery]);

  // Handle Team Selection
  useEffect(() => {
    if (!selectedTeamId && filteredData.length > 0) {
      // Auto-select first pending/draft team, or first team if all completed
      const nextTeam = filteredData.find(d => d.evaluationStatus === 'pending' || d.evaluationStatus === 'draft') || filteredData[0];
      setSelectedTeamId(nextTeam.team.id);
    }
  }, [filteredData, selectedTeamId]);

  // Load Evaluation Data when Team Changes
  useEffect(() => {
    if (selectedTeamId) {
      const currentData = combinedData.find(d => d.team.id === selectedTeamId);
      if (currentData && currentData.evalData) {
        const scoresMap: Record<string, number> = {};
        currentData.evalData.criteriaScores.forEach(c => {
          scoresMap[c.id] = c.score;
        });
        setCriteriaScores(scoresMap);
        setFeedback(currentData.evalData.feedback || '');
        setLocalEvalStatus(currentData.evalData.status === 'submitted' || currentData.evalData.locked ? 'submitted' : 'draft');
      } else {
        setCriteriaScores({});
        setFeedback('');
        setLocalEvalStatus('draft');
      }
      setSavingState('idle');
    }
  }, [selectedTeamId, combinedData]);

  const selectedTeamData = combinedData.find(d => d.team.id === selectedTeamId);

  const calculateTotal = () => {
    return Object.values(criteriaScores).reduce((acc, curr) => acc + curr, 0);
  };

  const handleScoreSelect = async (criterionId: string, score: number) => {
    if (localEvalStatus === 'submitted') return;
    
    const updatedScores = { ...criteriaScores, [criterionId]: score };
    setCriteriaScores(updatedScores);
    
    // Auto-save draft logic
    await autoSave(updatedScores, feedback);
  };

  const autoSave = async (scores: Record<string, number>, currentFeedback: string) => {
    if (!user || !activeRound || !selectedTeamData || localEvalStatus === 'submitted') return;
    
    setSavingState('saving');
    try {
      const criteria = (activeRound.evaluationCriteria || []).map(c => ({
        id: c.id,
        name: c.name,
        maxScore: c.maxScore,
        score: scores[c.id] || 0
      }));

      const evalData: Omit<Evaluation, 'id' | 'timestamp' | 'locked' | 'version'> = {
        judgeId: user.uid,
        teamId: selectedTeamData.team.id,
        roundId: Number(activeRound.id),
        criteriaScores: criteria,
        totalScore: Object.values(scores).reduce((acc, curr) => acc + curr, 0),
        feedback: currentFeedback,
        status: 'draft',
      };

      await EvaluationService.submitEvaluation(evalData);
      setSavingState('saved');
    } catch (err) {
      console.error('Auto-save failed:', err);
      setSavingState('error');
    }
  };

  const handleSubmitFinal = async () => {
    if (!user || !activeRound || !selectedTeamData) return;
    
    if (!window.confirm(`Submit final evaluation for ${selectedTeamData.team.name}?\n\nThis will lock the scores.`)) {
      return;
    }
    
    setSavingState('saving');
    try {
      const criteria = (activeRound.evaluationCriteria || []).map(c => ({
        id: c.id,
        name: c.name,
        maxScore: c.maxScore,
        score: criteriaScores[c.id] || 0
      }));

      const evalData: Omit<Evaluation, 'id' | 'timestamp' | 'locked' | 'version'> = {
        judgeId: user.uid,
        teamId: selectedTeamData.team.id,
        roundId: Number(activeRound.id),
        criteriaScores: criteria,
        totalScore: calculateTotal(),
        feedback,
        status: 'submitted',
      };

      await EvaluationService.submitEvaluation(evalData);
      setLocalEvalStatus('submitted');
      setSavingState('saved');
      
      // Optionally auto-advance to next team
      setTimeout(() => {
        const nextPending = filteredData.find(d => d.team.id !== selectedTeamId && (d.evaluationStatus === 'pending' || d.evaluationStatus === 'draft'));
        if (nextPending) {
          setSelectedTeamId(nextPending.team.id);
        }
      }, 1500);
      
    } catch (err) {
      console.error(err);
      setSavingState('error');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  if (!activeRound) return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col items-center justify-center">
      <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4 opacity-50" />
      <h2 className="font-bebas text-4xl tracking-widest text-white mb-2">NO LIVE ROUND ACTIVE</h2>
      <p className="font-inter text-gray-400 max-w-md text-center">There is currently no competition round that is in the Evaluation Phase with Live Judging enabled.</p>
      <Button variant="outline" className="mt-6" onClick={() => navigate('/workspace')}>Return to Dashboard</Button>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-4 mb-6 shrink-0">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
            LIVE JUDGING DASHBOARD
          </h2>
          <p className="font-inter text-gray-400">Round {activeRound?.id}: {activeRound?.displayName}</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right mr-4">
             <span className="block text-xs font-inter text-gray-500 uppercase">Progress</span>
             <span className="font-mono text-primary text-lg">
               {combinedData.filter(d => d.evaluationStatus === 'completed').length} / {combinedData.length}
             </span>
           </div>
           <Button variant="outline" onClick={() => navigate('/workspace/home')}>
             Exit Live Mode
           </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 min-h-0 overflow-hidden">
        
        {/* Left Sidebar: Team List */}
        <div className="w-full md:w-80 h-[30vh] md:h-auto shrink-0 flex flex-col gap-2 md:gap-4 overflow-hidden border border-white/10 rounded-xl bg-black/40">
          <div className="p-4 border-b border-white/10 bg-black/60">
            <h3 className="font-bebas text-xl text-white tracking-widest mb-3">ASSIGNED TEAMS</h3>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search name, ID, or track..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm font-inter text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredData.map((data) => (
              <button
                key={data.team.id}
                onClick={() => setSelectedTeamId(data.team.id)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedTeamId === data.team.id 
                    ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]' 
                    : 'bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${selectedTeamId === data.team.id ? 'bg-primary text-black' : 'bg-white/10 text-gray-400'}`}>
                    {data.team.id}
                  </span>
                  {data.evaluationStatus === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {data.evaluationStatus === 'draft' && <span className="w-2 h-2 rounded-full bg-yellow-500 mt-1"></span>}
                </div>
                <h4 className="font-bebas text-lg text-white tracking-wide truncate">{data.team.name}</h4>
                <p className="text-xs text-gray-500 font-inter truncate">{data.team.track}</p>
              </button>
            ))}
            {filteredData.length === 0 && (
              <div className="text-center p-8 text-gray-500 font-inter text-sm">
                No teams found.
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Active Evaluation */}
        <div className="flex-1 flex flex-col min-w-0 border border-white/10 rounded-xl bg-black/20 overflow-hidden relative">
          
          {selectedTeamData ? (
            <>
              {/* Selected Team Header */}
              <div className="p-4 border-b border-white/10 bg-black/60 shrink-0 flex justify-between items-center">
                <div>
                  <h2 className="font-bebas text-2xl md:text-3xl text-white tracking-wide mb-1">{selectedTeamData.team.name}</h2>
                  <div className="flex gap-2 text-xs md:text-sm">
                    <span className="text-gray-400 font-mono">ID: {selectedTeamData.team.id}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-primary font-inter truncate max-w-[150px] md:max-w-none">{selectedTeamData.team.track}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] md:text-xs font-inter text-gray-500 uppercase mb-1">Total Score</span>
                  <span className="font-bebas text-3xl md:text-4xl text-primary tracking-widest leading-none">
                    {calculateTotal()}
                  </span>
                </div>
              </div>

              {/* Evaluation Scrollable Area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 relative">
                
                {localEvalStatus === 'submitted' && (
                  <div className="absolute inset-0 bg-black/40 z-10 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="bg-black border border-green-500/30 p-8 rounded-xl text-center max-w-md shadow-2xl">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="font-bebas text-3xl text-white tracking-widest mb-2">EVALUATION COMPLETE</h3>
                      <p className="text-gray-400 font-inter text-sm">You have finalized the score for {selectedTeamData.team.name}. Select another team to continue.</p>
                    </div>
                  </div>
                )}

                {!activeRound?.evaluationCriteria || activeRound.evaluationCriteria.length === 0 ? (
                  <div className="text-center text-gray-500 p-10">No criteria configured.</div>
                ) : (
                  activeRound.evaluationCriteria.map((crit) => (
                    <div key={crit.id} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div>
                          <h4 className="font-bebas text-xl text-white tracking-wide">{crit.name}</h4>
                          {crit.description && <p className="text-xs font-inter text-gray-400">{crit.description}</p>}
                        </div>
                        <span className="text-gray-500 font-mono text-xs">Max: {crit.maxScore}</span>
                      </div>
                      
                      {/* Circular Rating Buttons */}
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {Array.from({ length: crit.maxScore + 1 }).map((_, i) => {
                          const isSelected = criteriaScores[crit.id] === i;
                          return (
                            <button
                              key={i}
                              onClick={() => handleScoreSelect(crit.id, i)}
                              disabled={localEvalStatus === 'submitted'}
                              className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bebas text-base md:text-lg transition-all duration-200 disabled:opacity-50 ${
                                isSelected 
                                  ? 'bg-primary text-black scale-110 shadow-[0_0_10px_rgba(var(--primary-rgb),0.4)] border-2 border-primary' 
                                  : 'bg-black/60 text-gray-400 border border-white/10 hover:border-primary/50 hover:text-white'
                              }`}
                            >
                              {i}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}

                <div className="pt-6 border-t border-white/10">
                  <label className="block text-sm font-bebas text-white tracking-widest mb-3">QUICK NOTES (OPTIONAL)</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    onBlur={() => autoSave(criteriaScores, feedback)}
                    disabled={localEvalStatus === 'submitted'}
                    placeholder="Jot down quick feedback..."
                    className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-4 text-sm font-inter text-white focus:outline-none focus:border-primary/50 transition-colors resize-none disabled:opacity-50"
                  ></textarea>
                </div>

              </div>

              {/* Bottom Action Bar */}
              <div className="p-4 md:p-6 border-t border-white/10 bg-black/80 shrink-0 flex justify-between items-center z-20 relative">
                <div className="flex items-center gap-2 md:gap-3">
                  {savingState === 'saving' && <span className="text-xs md:text-sm font-mono text-yellow-500 flex items-center"><div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mr-1 md:mr-2"></div> <span className="hidden md:inline">Live Syncing...</span></span>}
                  {savingState === 'saved' && <span className="text-xs md:text-sm font-mono text-green-500 flex items-center"><Save className="w-3 h-3 md:w-4 md:h-4 mr-1" /> Synced</span>}
                  {savingState === 'error' && <span className="text-xs md:text-sm font-mono text-red-500">Sync failed!</span>}
                </div>
                
                <Button 
                  variant="primary" 
                  size="lg"
                  className="font-bebas tracking-widest text-lg md:text-xl px-6 md:px-10 py-4 md:py-6"
                  onClick={handleSubmitFinal}
                  disabled={localEvalStatus === 'submitted' || savingState === 'saving'}
                >
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 mr-2" />
                  SUBMIT & LOCK
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-10 text-center">
              <Users className="w-16 h-16 mb-4 opacity-50" />
              <h3 className="font-bebas text-3xl tracking-widest text-white mb-2">NO TEAM SELECTED</h3>
              <p className="font-inter max-w-sm">Select a team from the left sidebar to begin live evaluation.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
