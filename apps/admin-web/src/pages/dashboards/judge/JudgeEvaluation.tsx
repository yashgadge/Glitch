import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ArrowLeft, CheckCircle, AlertTriangle, MessageSquare, ExternalLink, User, FileText, Send } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { ParticipantService } from '@shared/services/ParticipantService';
import { TeamService } from '@shared/services/TeamService';
import { EvaluationService } from '@shared/services/EvaluationService';
import { RoundService } from '@shared/services/RoundService';
import { SubmissionService } from '@shared/services/SubmissionService';
import { HelpService } from '@shared/services/HelpService';
import type { Team, Round, Evaluation, Submission, SubmissionVersion, Participant } from '@shared/types/models';
import type { IssueCategory } from '@shared/types/models';

type Tab = 'OVERVIEW' | 'SUBMISSION' | 'EVALUATION' | 'NOTES';

export default function JudgeEvaluation() {
  const { user } = useAuth();
  const { teamId } = useParams<{ teamId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Participant[]>([]);
  const [allRounds, setAllRounds] = useState<Round[]>([]);
  const [round, setRound] = useState<Round | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submissionVersion, setSubmissionVersion] = useState<SubmissionVersion | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');
  
  const [issueCategory, setIssueCategory] = useState<IssueCategory>('Submission issue');
  const [issueDetails, setIssueDetails] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState('');
  
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!user || !teamId) return;

    let unsubEvals: () => void;
    let unsubSub: () => void;

    const fetchInitial = async () => {
      try {
        setLoading(true);
        const rounds = await RoundService.getAllRounds();
        setAllRounds(rounds);
        
        const paramRoundId = searchParams.get('roundId');
        let activeR = paramRoundId ? rounds.find(r => String(r.id) === paramRoundId) : undefined;
        
        if (!activeR) {
          activeR = rounds.find(r => r.status === 'EVALUATION_OPEN') || rounds[0];
        }
        
        setRound(activeR || null);
        
        if (!activeR) {
          setLoading(false);
          return;
        }

        const t = await TeamService.getTeam(teamId);
        if (!t) {
          setLoading(false);
          return;
        }
        setTeam(t);

        const fetchedMembers = await Promise.all(
          t.memberIds.map(uid => ParticipantService.getParticipant(uid))
        );
        setMembers(fetchedMembers.filter(Boolean) as Participant[]);

        unsubSub = SubmissionService.subscribeToTeamSubmission(teamId, Number(activeR.id), async (sub) => {
          setSubmission(sub);
          if (sub) {
            const version = await SubmissionService.getLatestVersion(sub.id, sub.currentVersion);
            setSubmissionVersion(version);
          } else {
            setSubmissionVersion(null);
          }
        });

        unsubEvals = EvaluationService.subscribeToJudgeEvaluations(user.uid, (evals) => {
          const myEval = evals.find(e => e.teamId === teamId && e.roundId === Number(activeR?.id));
          setEvaluation(myEval || null);
          
          if (myEval) {
            const scoresMap: Record<string, number> = {};
            myEval.criteriaScores.forEach(c => {
              scoresMap[c.id] = c.score;
            });
            setCriteriaScores(scoresMap);
            setFeedback(myEval.feedback || '');
          }
          
          setLoading(false);
        });
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    
    fetchInitial();
    
    return () => {
      if (unsubSub) unsubSub();
      if (unsubEvals) unsubEvals();
    };
  }, [user, teamId, searchParams]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  if (!team || !round) return (
    <div className="text-center p-8">
      <h3 className="font-bebas text-2xl tracking-wide text-white">Team or Round Not Found</h3>
      <Button variant="outline" className="mt-4" onClick={() => navigate('/workspace/teams')}>Go Back</Button>
    </div>
  );

  const isSubmitted = evaluation?.status === 'submitted' || evaluation?.locked;
  const isReopened = evaluation?.status === 'draft' && evaluation?.timestamp;
  
  const handleScoreChange = (criterionId: string, val: string, max: number) => {
    let num = parseInt(val, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > max) num = max;
    setCriteriaScores(prev => ({ ...prev, [criterionId]: num }));
  };

  const calculateTotal = () => {
    return Object.values(criteriaScores).reduce((acc, curr) => acc + curr, 0);
  };

  const handleSave = async (submitFinal: boolean) => {
    if (!user || !round) return;
    
    if (submitFinal) {
      if (!window.confirm(`Submit evaluation for ${team.name}?\n\nOnce submitted, the evaluation will be locked. Admin can reopen it if a correction is required.`)) {
        return;
      }
    }
    
    setSavingState('saving');
    try {
      const criteria: import('@shared/types/models').EvaluationCriteria[] = (round.evaluationCriteria || []).map(c => ({
        id: c.id,
        name: c.name,
        maxScore: c.maxScore,
        score: criteriaScores[c.id] || 0
      }));

      const evalData: Omit<Evaluation, 'id' | 'timestamp' | 'locked' | 'version'> = {
        judgeId: user.uid,
        teamId: team.id,
        roundId: Number(round.id),
        submissionId: submission?.id,
        submissionVersionId: submissionVersion?.id,
        criteriaScores: criteria,
        totalScore: calculateTotal(),
        feedback,
        status: submitFinal ? 'submitted' : 'draft',
      };

      await EvaluationService.submitEvaluation(evalData);
      
      setSavingState('saved');
      setTimeout(() => setSavingState('idle'), 3000);
      
      if (submitFinal) {
        window.scrollTo(0, 0);
      }
    } catch (err) {
      console.error(err);
      setSavingState('error');
    }
  };

  const handleFlagIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !issueDetails.trim()) return;
    setIssueSubmitting(true);
    setIssueSuccess('');
    try {
      await HelpService.submitIssue(user.uid, team.id, Number(round.id), issueCategory, issueDetails);
      setIssueSuccess('Issue flagged successfully. Admins have been notified.');
      setIssueDetails('');
    } catch (err) {
      console.error(err);
    } finally {
      setIssueSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      <button 
        onClick={() => navigate('/workspace/teams')}
        className="flex items-center text-sm font-inter text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to My Teams
      </button>

      {/* Header */}
      <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
        <div className="h-1 bg-primary"></div>
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{team.id}</span>
                <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">{team.track}</span>
              </div>
              <h1 className="font-bebas text-4xl text-white tracking-wide">{team.name}</h1>
            </div>
            
            <div className="flex flex-col items-start md:items-end gap-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-inter text-gray-500 uppercase">Evaluating Round:</span>
                <select 
                  value={round.id}
                  onChange={(e) => {
                    setSearchParams({ roundId: e.target.value });
                    setCriteriaScores({});
                    setFeedback('');
                  }}
                  className="bg-black/60 border border-white/20 rounded px-2 py-1 text-xs font-bebas tracking-widest text-primary focus:outline-none"
                >
                  {allRounds.map(r => (
                    <option key={r.id} value={r.id}>{r.displayName}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-inter text-gray-500 uppercase">Presentation:</span>
                <span className="text-xs font-mono text-gray-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">{team.presentationStatus || 'WAITING'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-inter text-gray-500 uppercase">Evaluation:</span>
                {isSubmitted ? (
                  <span className="text-xs font-mono text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">COMPLETED</span>
                ) : isReopened ? (
                  <span className="text-xs font-mono text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">REOPENED</span>
                ) : evaluation?.status === 'draft' ? (
                  <span className="text-xs font-mono text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">DRAFT</span>
                ) : (
                  <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">PENDING</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex bg-black/60 border border-white/10 rounded-lg overflow-hidden overflow-x-auto">
            {['OVERVIEW', round?.evaluationMode !== 'LIVE' ? 'SUBMISSION' : null, 'EVALUATION', 'NOTES'].filter(Boolean).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as Tab)}
                className={`flex-1 px-6 py-3 text-sm font-bebas tracking-widest whitespace-nowrap transition-colors border-r border-white/10 last:border-0 ${
                  activeTab === tab ? 'bg-primary text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="mt-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 border-white/10">
              <h3 className="font-bebas text-xl text-white tracking-widest mb-4">TEAM MEMBERS</h3>
              <div className="space-y-4">
                {members.map(member => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-inter font-medium text-white text-sm">{member.name}</p>
                      <p className="font-mono text-xs text-gray-500">{member.glitchId} {team.leaderId === member.id && '(Leader)'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            
            <Card className="p-6 border-white/10">
              <h3 className="font-bebas text-xl text-white tracking-widest mb-4">ROUND DETAILS</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-inter text-gray-500 uppercase mb-1">Round Name</p>
                  <p className="font-inter text-gray-300 text-sm">{round.displayName}</p>
                </div>
                <div>
                  <p className="text-xs font-inter text-gray-500 uppercase mb-1">Track</p>
                  <p className="font-inter text-gray-300 text-sm">{team.track}</p>
                </div>
                {round.instructions && (
                  <div>
                    <p className="text-xs font-inter text-gray-500 uppercase mb-1">Instructions for Judges</p>
                    <p className="font-inter text-gray-400 text-sm leading-relaxed">{round.instructions}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* SUBMISSION TAB */}
        {activeTab === 'SUBMISSION' && (
          <Card className="p-6 md:p-8 border-white/10">
            <h3 className="font-bebas text-2xl text-white tracking-widest mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> SUBMISSION MATERIAL
            </h3>
            
            {!submissionVersion ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-lg bg-white/5">
                <FileText className="w-10 h-10 text-gray-500 mx-auto mb-3 opacity-50" />
                <h4 className="font-bebas text-xl text-gray-300 tracking-wide">NO SUBMISSION FOUND</h4>
                <p className="font-inter text-sm text-gray-500 mt-1">The team has not submitted materials for this round.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-black/40 p-4 rounded-lg border border-white/10">
                  <div>
                    <span className="text-xs font-inter text-gray-500 uppercase block mb-1">Submission Status</span>
                    <span className="font-mono text-white text-sm">{submission?.status.toUpperCase() || 'UNKNOWN'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-inter text-gray-500 uppercase block mb-1">Last Updated</span>
                    <span className="font-mono text-white text-sm">{new Date(submissionVersion.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="space-y-6 pt-4">
                  {Object.entries(submissionVersion.fields).map(([key, value]) => {
                    const isUrl = typeof value === 'string' && value.startsWith('http');
                    return (
                      <div key={key} className="border-b border-white/5 pb-6 last:border-0">
                        <h4 className="font-bebas text-lg text-primary tracking-wider mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                        {isUrl ? (
                          <a href={value as string} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-sm font-inter text-white transition-colors">
                            <ExternalLink className="w-4 h-4" /> Open Link
                          </a>
                        ) : (
                          <p className="font-inter text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{String(value)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* EVALUATION TAB */}
        {activeTab === 'EVALUATION' && (
          <div className="space-y-6">
            <Card className="p-6 md:p-8 border-primary/30 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
              
              <div className="flex justify-between items-center border-b border-white/10 pb-6 mb-6">
                <h3 className="font-bebas text-3xl text-white tracking-widest">EVALUATION RUBRIC</h3>
                <div className="text-right">
                  <span className="block text-xs font-inter text-gray-500 uppercase mb-1">Total Score</span>
                  <span className="font-bebas text-4xl text-primary tracking-widest">{calculateTotal()} <span className="text-lg text-gray-500">/ 100</span></span>
                </div>
              </div>

              {!round.evaluationCriteria || round.evaluationCriteria.length === 0 ? (
                <p className="text-gray-400 font-inter text-sm">No criteria configured for this round.</p>
              ) : (
                <div className="space-y-8">
                  {round.evaluationCriteria.map((crit) => (
                    <div key={crit.id} className="bg-black/20 p-4 md:p-6 rounded-lg border border-white/5">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3">
                        <div className="flex-1">
                          <h4 className="font-bebas text-xl text-white tracking-wide">{crit.name}</h4>
                          {crit.description && <p className="text-xs font-inter text-gray-400 mt-1">{crit.description}</p>}
                        </div>
                        <div className="shrink-0 flex items-center gap-3 bg-black/40 border border-white/10 px-4 py-2 rounded-lg">
                          <input
                            type="number"
                            min="0"
                            max={crit.maxScore}
                            value={criteriaScores[crit.id] !== undefined ? criteriaScores[crit.id] : ''}
                            onChange={(e) => handleScoreChange(crit.id, e.target.value, crit.maxScore)}
                            disabled={isSubmitted}
                            className="w-16 bg-transparent text-2xl font-bebas text-center text-white focus:outline-none focus:text-primary transition-colors disabled:opacity-50"
                            placeholder="0"
                          />
                          <span className="font-bebas text-xl text-gray-600">/ {crit.maxScore}</span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-4">
                        <div 
                          className={`h-full transition-all duration-300 ${isSubmitted ? 'bg-gray-500' : 'bg-primary'}`}
                          style={{ width: `${((criteriaScores[crit.id] || 0) / crit.maxScore) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t border-white/10">
                    <label className="block text-sm font-bebas text-white tracking-widest mb-2">OVERALL JUDGE COMMENTS</label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      disabled={isSubmitted}
                      placeholder="Provide overall feedback, strengths, and areas for improvement..."
                      className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-4 text-sm font-inter text-white focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50 resize-none"
                    ></textarea>
                  </div>
                </div>
              )}
            </Card>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-black/60 border border-white/10 p-4 md:p-6 rounded-lg sticky bottom-4 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                {savingState === 'saving' && <span className="text-sm font-mono text-gray-400 flex items-center"><div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div> Saving...</span>}
                {savingState === 'saved' && <span className="text-sm font-mono text-green-500 flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> Draft Saved</span>}
                {savingState === 'error' && <span className="text-sm font-mono text-red-500">Error saving</span>}
                {savingState === 'idle' && evaluation?.timestamp && !isSubmitted && <span className="text-xs font-mono text-gray-500">Last saved: {new Date(evaluation.timestamp).toLocaleTimeString()}</span>}
              </div>
              
              <div className="flex gap-3 w-full md:w-auto">
                {!isSubmitted && (
                  <Button variant="outline" className="flex-1 md:flex-none font-bebas tracking-widest" onClick={() => handleSave(false)} disabled={savingState === 'saving'}>
                    SAVE DRAFT
                  </Button>
                )}
                {!isSubmitted ? (
                  <Button variant="primary" className="flex-1 md:flex-none font-bebas tracking-widest" onClick={() => handleSave(true)} disabled={savingState === 'saving'}>
                    SUBMIT EVALUATION
                  </Button>
                ) : (
                  <div className="flex items-center text-green-500 font-bebas tracking-widest text-lg px-4 py-2 border border-green-500/20 bg-green-500/10 rounded">
                    <CheckCircle className="w-5 h-5 mr-2" /> EVALUATION SUBMITTED
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'NOTES' && (
          <Card className="p-6 md:p-8 border-white/10">
            <h3 className="font-bebas text-2xl text-white tracking-widest mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" /> FLAG ISSUE / REQUEST HELP
            </h3>
            
            <p className="text-sm font-inter text-gray-400 mb-8">
              If you encounter a problem with the submission, the presentation, or need admin assistance, report it here. Admin will receive the notification and can take appropriate action.
            </p>

            <form onSubmit={handleFlagIssue} className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-bebas text-white tracking-widest mb-2">Issue Category</label>
                <select 
                  value={issueCategory}
                  onChange={(e) => setIssueCategory(e.target.value as IssueCategory)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm font-inter text-white focus:outline-none focus:border-primary/50 transition-colors"
                >
                  <option value="Submission issue">Submission Problem</option>
                  <option value="Demo not working">Demo Not Working</option>
                  <option value="Rule concern">Rule Concern</option>
                  <option value="Possible plagiarism">Possible Plagiarism</option>
                  <option value="Missing requirement">Missing Requirement</option>
                  <option value="Technical problem">Technical Problem</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bebas text-white tracking-widest mb-2">Details</label>
                <textarea
                  value={issueDetails}
                  onChange={(e) => setIssueDetails(e.target.value)}
                  placeholder="Please describe the issue in detail..."
                  required
                  className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-4 text-sm font-inter text-white focus:outline-none focus:border-primary/50 transition-colors resize-none"
                ></textarea>
              </div>
              
              {issueSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded text-sm font-inter flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 shrink-0" /> {issueSuccess}
                </div>
              )}
              
              <Button type="submit" variant="outline" className="w-full font-bebas tracking-widest" disabled={issueSubmitting || !issueDetails.trim()}>
                {issueSubmitting ? 'SUBMITTING...' : 'FLAG ISSUE TO ADMIN'} <Send className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </Card>
        )}

      </div>
    </div>
  );
}
