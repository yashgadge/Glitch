import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { CheckSquare, ArrowLeft, ArrowRight, ExternalLink, Save, Send, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { ParticipantService } from '../../../services/ParticipantService';
import { ClassroomService } from '../../../services/ClassroomService';
import { TeamService } from '../../../services/TeamService';
import { EvaluationService, type CriterionTemplate } from '../../../services/EvaluationService';
import { SubmissionService } from '../../../services/SubmissionService';
import { useToast } from '../../../components/ui/ToastContext';
import type { Staff, Team, Classroom, Evaluation, EvaluationCriteria, Submission } from '../../../types/models';

export default function JudgeEvaluation() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();
  
  const [profile, setProfile] = useState<Staff | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  
  const [criteriaTemplates, setCriteriaTemplates] = useState<CriterionTemplate[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [allEvaluations, setAllEvaluations] = useState<Evaluation[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');
  
  const [seatIds, setSeatIds] = useState<{ prev: string | null, next: string | null, current: string | null }>({ prev: null, next: null, current: null });
  const [isSaving, setIsSaving] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);

  useEffect(() => {
    if (!user || !teamId) return;
    
    const init = async () => {
      const staff = await ParticipantService.getStaffProfile(user.uid);
      setProfile(staff);
      
      const t = await TeamService.getTeam(teamId);
      setTeam(t);
      
      if (staff?.assignedClassroom) {
        ClassroomService.subscribeToClassroom(staff.assignedClassroom, (cr) => {
          setClassroom(cr);
          if (cr && t) {
            const activeEntries = cr.seatingPlan.filter(s => s.teamId);
            const currentIndex = activeEntries.findIndex(s => s.teamId === t.id);
            if (currentIndex !== -1) {
              setSeatIds({
                current: activeEntries[currentIndex].seatId,
                prev: currentIndex > 0 ? activeEntries[currentIndex - 1].teamId : null,
                next: currentIndex < activeEntries.length - 1 ? activeEntries[currentIndex + 1].teamId : null
              });
            }
          }
        });
      }
      
      SubmissionService.subscribeToTeamSubmission(teamId, (sub) => {
        setSubmission(sub);
      });
      
      EvaluationService.subscribeToJudgeEvaluations(user.uid, (evals) => {
        setAllEvaluations(evals);
      });
      
      EvaluationService.subscribeToCriteria((configs) => {
        const active = configs.filter(c => c.enabled);
        setCriteriaTemplates(active);
      });
    };
    
    init();
  }, [user, teamId]);
  
  // Load existing evaluation once classroom and criteria are loaded
  useEffect(() => {
    if (user && teamId && classroom?.currentRound && criteriaTemplates.length > 0) {
      EvaluationService.getJudgeEvaluation(user.uid, teamId, classroom.currentRound).then((ev) => {
        if (ev) {
          setEvaluation(ev);
          const loadedScores: Record<string, number> = {};
          ev.criteriaScores.forEach(c => {
            loadedScores[c.id] = c.score;
          });
          setScores(loadedScores);
          setFeedback(ev.feedback || '');
        } else {
          // Initialize empty scores
          const initialScores: Record<string, number> = {};
          criteriaTemplates.forEach(c => initialScores[c.id] = 0);
          setScores(initialScores);
          setEvaluation(null);
          setFeedback('');
        }
      });
    }
  }, [user, teamId, classroom?.currentRound, criteriaTemplates]);

  const handleScoreChange = (criterionId: string, score: number) => {
    if (evaluation?.status === 'submitted' || evaluation?.locked) return;
    setScores(prev => ({ ...prev, [criterionId]: score }));
  };

  const handleSave = async (isSubmit: boolean = false) => {
    if (!user || !teamId || !classroom?.currentRound) return;
    
    // Validate
    if (isSubmit) {
      for (const ct of criteriaTemplates) {
        if (!scores[ct.id]) {
          error(`Please score all criteria before submitting.`);
          return;
        }
      }
      if (!window.confirm("Are you sure? Submitting will lock the evaluation.")) return;
    }

    setIsSaving(true);
    
    try {
      const criteriaScores: EvaluationCriteria[] = criteriaTemplates.map(ct => ({
        id: ct.id,
        name: ct.name,
        maxScore: ct.maxScore,
        score: scores[ct.id] || 0
      }));
      
      const totalScore = criteriaScores.reduce((acc, c) => acc + c.score, 0);
      
      const evPayload: Omit<Evaluation, 'id' | 'timestamp' | 'locked' | 'version'> = {
        judgeId: user.uid,
        teamId,
        roundId: classroom.currentRound,
        submissionId: submission?.id,
        criteriaScores,
        totalScore,
        feedback,
        status: isSubmit ? 'submitted' : 'draft',
      };
      
      await EvaluationService.submitEvaluation(evPayload);
      success(isSubmit ? 'Evaluation Submitted' : 'Draft Saved');
      
      if (isSubmit) {
        // Refresh local evaluation state
        const refreshed = await EvaluationService.getJudgeEvaluation(user.uid, teamId, classroom.currentRound);
        setEvaluation(refreshed);
        
        if (seatIds.next) {
          navigate(`/workspace/teams/${seatIds.next}`);
        } else {
          setShowAllDone(true);
        }
      }
    } catch (err) {
      error('Failed to save evaluation');
    } finally {
      setIsSaving(false);
    }
  };

  if (!team || !classroom) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] xl:col-span-1" />
          <Skeleton className="h-[600px] xl:col-span-2" />
        </div>
      </div>
    );
  }

  if (showAllDone) {
    return (
      <div className="max-w-3xl mx-auto pt-20">
        <EmptyState 
          icon={CheckSquare}
          title="All Evaluations Complete"
          description="You have successfully evaluated all assigned teams."
          actionLabel="RETURN TO TEAM LIST"
          onAction={() => navigate('/workspace/teams')}
        />
      </div>
    );
  }

  const isLocked = evaluation?.locked || evaluation?.status === 'submitted' || !!team?.eliminated || !!team?.disqualified;
  
  const activeEntriesCount = classroom.seatingPlan.filter(s => s.teamId).length;
  const completedEvaluationsCount = allEvaluations.filter(e => e.roundId === classroom.currentRound && (e.status === 'submitted' || e.locked)).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/workspace/teams')} className="text-gray-400">
          <ArrowLeft className="w-4 h-4 mr-2" /> BACK TO TEAMS
        </Button>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-gray-500 font-inter uppercase">Progress</span>
            <div className="font-mono text-primary text-sm bg-primary/10 px-2 py-0.5 rounded">
              {completedEvaluationsCount} / {activeEntriesCount} Teams
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              disabled={!seatIds.prev} 
              onClick={() => seatIds.prev && navigate(`/workspace/teams/${seatIds.prev}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> PREV TEAM
            </Button>
            <Button 
              variant="outline" 
              disabled={!seatIds.next} 
              onClick={() => seatIds.next && navigate(`/workspace/teams/${seatIds.next}`)}
            >
              NEXT TEAM <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-6">
          <Card className="p-6 border-primary/20">
            <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-primary font-inter text-sm mb-1 block">SEAT {seatIds.current}</span>
                  <h2 className="font-bebas text-3xl text-white">{team?.name || 'Unnamed Team'}</h2>
                  <p className="text-gray-400 font-inter text-sm">{team?.track || 'Unassigned Track'}</p>
                </div>
              <div className="text-right">
                <span className="text-gray-500 font-inter text-xs block">ROUND</span>
                <span className="text-xl font-bebas text-white">{classroom.currentRound}</span>
              </div>
            </div>
            
            {submission ? (
              <div className="space-y-4 pt-4 border-t border-white/5">
                {Object.entries(submission.fields).map(([key, value]) => {
                  if (!value) return null;
                  const isUrl = typeof value === 'string' && value.startsWith('http');
                  return (
                    <div key={key}>
                      <span className="text-gray-500 font-inter text-xs uppercase">{key.replace(/_/g, ' ')}</span>
                      {isUrl ? (
                        <a href={value} target="_blank" rel="noreferrer" className="flex items-center text-blue-400 text-sm hover:underline font-inter break-all mt-1">
                          <ExternalLink className="w-3 h-3 mr-1 flex-shrink-0" /> {value}
                        </a>
                      ) : (
                        <p className="text-gray-200 font-inter text-sm mt-1 whitespace-pre-wrap">{value}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center border-t border-white/5 mt-4">
                <p className="text-yellow-500 font-inter text-sm">No submission available for this team.</p>
              </div>
            )}
          </Card>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
              <h3 className="font-bebas text-2xl text-white flex items-center gap-2">
                <CheckSquare className="w-6 h-6 text-primary" /> EVALUATION
              </h3>
              {team?.disqualified ? (
                <div className="flex items-center text-red-500 font-mono text-sm bg-red-500/10 px-3 py-1 rounded">
                  TEAM DISQUALIFIED
                </div>
              ) : team?.eliminated ? (
                <div className="flex items-center text-red-500 font-mono text-sm bg-red-500/10 px-3 py-1 rounded">
                  TEAM ELIMINATED
                </div>
              ) : isLocked && (
                <div className="flex items-center text-green-500 font-mono text-sm bg-green-500/10 px-3 py-1 rounded">
                  SUBMITTED & LOCKED
                </div>
              )}
            </div>

            <div className="space-y-8">
              {criteriaTemplates.map((crit) => (
                <div key={crit.id} className="space-y-3">
                  <div>
                    <div className="flex justify-between">
                      <h4 className="font-inter font-medium text-white text-lg">{crit.name}</h4>
                      <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded text-sm">
                        {scores[crit.id] || 0} / {crit.maxScore}
                      </span>
                    </div>
                    {crit.description && <p className="text-sm text-gray-400 font-inter mt-1">{crit.description}</p>}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: crit.maxScore }, (_, i) => i + 1).map((mark) => (
                      <button
                        key={mark}
                        disabled={isLocked}
                        onClick={() => handleScoreChange(crit.id, mark)}
                        className={`w-10 h-10 rounded-lg font-bebas text-xl transition-all ${
                          scores[crit.id] === mark 
                            ? 'bg-primary text-black scale-110 shadow-[0_0_15px_rgba(0,240,255,0.4)]' 
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                        } ${isLocked ? 'opacity-50 cursor-not-allowed hover:bg-white/5 hover:scale-100 shadow-none' : ''}`}
                      >
                        {mark}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="pt-4 border-t border-white/5 space-y-2">
                <h4 className="font-inter font-medium text-white text-lg">Overall Remarks (Optional)</h4>
                <textarea 
                  disabled={isLocked}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-4 text-white font-inter focus:border-primary transition-colors min-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Provide any additional context or feedback..."
                />
              </div>

              {!isLocked && (
                <div className="flex gap-4 pt-6 border-t border-white/10">
                  <Button 
                    variant="outline" 
                    className="flex-1 font-bebas tracking-widest text-lg h-14"
                    onClick={() => handleSave(false)}
                    disabled={isSaving}
                  >
                    <Save className="w-5 h-5 mr-2" /> SAVE DRAFT
                  </Button>
                  <Button 
                    variant="primary" 
                    className="flex-1 font-bebas tracking-widest text-lg h-14"
                    onClick={() => handleSave(true)}
                    disabled={isSaving}
                  >
                    <Send className="w-5 h-5 mr-2" /> SUBMIT EVALUATION
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
