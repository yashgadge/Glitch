import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { CheckSquare, ArrowRight, Edit3, SearchX, Clock } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { TeamService } from '@shared/services/TeamService';
import { EvaluationService } from '@shared/services/EvaluationService';
import { RoundService } from '@shared/services/RoundService';
import type { Team, Round, JudgeAssignment, Evaluation } from '@shared/types/models';

interface EvalRowData {
  team: Team;
  evaluationStatus: 'pending' | 'draft' | 'completed' | 'reopened';
  score?: number;
  timestamp?: string;
}

export default function JudgeEvaluationsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  const [teamsData, setTeamsData] = useState<EvalRowData[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'draft' | 'completed' | 'reopened'>('pending');

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
            setTeamsData([]);
            setLoading(false);
            return;
          }
          
          const tilesPromises = judgeAssignments.map(async (assignment) => {
            const team = await TeamService.getTeam(assignment.teamId);
            if (!team) return null;
            return {
              team,
              evaluationStatus: 'pending' as const
            };
          });
          
          const resolvedTiles = (await Promise.all(tilesPromises)).filter(Boolean) as EvalRowData[];
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
      let eStatus: EvalRowData['evaluationStatus'] = 'pending';
      let score = 0;
      let timestamp = undefined;
      
      if (evalData) {
        if (evalData.status === 'draft') eStatus = 'draft';
        else if (evalData.status === 'locked' || evalData.status === 'submitted') eStatus = 'completed';
        // Note: Reopened state logic would go here if represented in models (e.g. status === 'reopened')
        score = evalData.totalScore;
        timestamp = evalData.timestamp;
      }
      return { ...td, evaluationStatus: eStatus, score, timestamp };
    });
  }, [teamsData, evaluations]);

  const filteredData = combinedData.filter(d => d.evaluationStatus === activeTab).sort((a, b) => {
    if (a.timestamp && b.timestamp) return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    return 0;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  if (!activeRound) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="font-bebas text-4xl tracking-widest text-white border-b border-white/10 pb-4">EVALUATIONS</h2>
        <Card className="p-8 text-center border-white/5">
          <CheckSquare className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <h3 className="font-bebas text-xl text-white tracking-wide">NO ACTIVE ROUND</h3>
          <p className="text-gray-400 font-inter text-sm mt-1">There is no active evaluation round at this time.</p>
        </Card>
      </div>
    );
  }

  const counts = {
    pending: combinedData.filter(d => d.evaluationStatus === 'pending').length,
    draft: combinedData.filter(d => d.evaluationStatus === 'draft').length,
    completed: combinedData.filter(d => d.evaluationStatus === 'completed').length,
    reopened: combinedData.filter(d => d.evaluationStatus === 'reopened').length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white">EVALUATIONS</h2>
          <p className="font-inter text-primary">ROUND {activeRound.id} — {activeRound.displayName}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-black/40 border border-white/10 rounded-lg overflow-hidden shrink-0 w-full md:w-auto overflow-x-auto">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 text-sm font-bebas tracking-widest transition-colors whitespace-nowrap flex-1 ${activeTab === 'pending' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`}
        >
          PENDING ({counts.pending})
        </button>
        <button
          onClick={() => setActiveTab('draft')}
          className={`px-6 py-3 text-sm font-bebas tracking-widest transition-colors whitespace-nowrap flex-1 ${activeTab === 'draft' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}
        >
          DRAFT ({counts.draft})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-6 py-3 text-sm font-bebas tracking-widest transition-colors whitespace-nowrap flex-1 ${activeTab === 'completed' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}
        >
          COMPLETED ({counts.completed})
        </button>
        <button
          onClick={() => setActiveTab('reopened')}
          className={`px-6 py-3 text-sm font-bebas tracking-widest transition-colors whitespace-nowrap flex-1 ${activeTab === 'reopened' ? 'bg-red-500 text-black' : 'text-gray-400 hover:text-white'}`}
        >
          REOPENED ({counts.reopened})
        </button>
      </div>

      {filteredData.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center border-white/5 bg-black/20">
          <SearchX className="w-12 h-12 text-gray-500 mb-4" />
          <h3 className="font-bebas text-2xl text-gray-300 tracking-wide mb-2">NO {activeTab.toUpperCase()} EVALUATIONS</h3>
          <p className="text-gray-500 font-inter text-sm">You have no evaluations in this state.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Header Row */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2 text-xs font-mono text-gray-500 uppercase tracking-wider">
            <div className="col-span-5">Team</div>
            <div className="col-span-3">Track</div>
            <div className="col-span-2">Score</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          
          {filteredData.map(({ team, evaluationStatus, score, timestamp }) => {
            const isCompleted = evaluationStatus === 'completed';
            const isDraft = evaluationStatus === 'draft';
            const isReopened = evaluationStatus === 'reopened';
            
            return (
              <Card key={team.id} className="p-0 overflow-hidden group border-white/10 hover:border-white/30 transition-colors bg-black/40">
                <div className="flex flex-col md:grid md:grid-cols-12 md:items-center">
                  
                  <div className="p-4 md:px-6 md:py-4 md:col-span-5 border-b md:border-b-0 border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{team.id}</span>
                      {timestamp && (
                        <span className="text-[10px] font-mono text-gray-500 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(timestamp).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bebas text-xl text-white tracking-wide">{team.name}</h3>
                  </div>
                  
                  <div className="p-4 md:px-0 md:col-span-3 border-b md:border-b-0 border-white/10 flex items-center">
                    <span className="text-sm font-inter text-gray-400">{team.track}</span>
                  </div>
                  
                  <div className="p-4 md:px-0 md:col-span-2 border-b md:border-b-0 border-white/10 flex items-center">
                    {evaluationStatus === 'pending' ? (
                      <span className="text-sm font-mono text-gray-500">—</span>
                    ) : (
                      <span className={`text-lg font-bebas tracking-widest ${isCompleted ? 'text-green-500' : 'text-primary'}`}>
                        {score} <span className="text-sm text-gray-500">/ 100</span>
                      </span>
                    )}
                  </div>
                  
                  <div className="p-4 md:px-6 md:col-span-2 flex items-center justify-end">
                    <Button
                      variant={isCompleted ? 'outline' : 'primary'}
                      className="w-full md:w-auto font-bebas tracking-widest text-sm"
                      onClick={() => navigate(`/workspace/teams/${team.id}?roundId=${activeRound.id}`)}
                    >
                      {isCompleted ? (
                        <>VIEW</>
                      ) : isDraft || isReopened ? (
                        <>CONTINUE <Edit3 className="w-4 h-4 ml-2" /></>
                      ) : (
                        <>START <ArrowRight className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
