import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@shared/contexts/AuthContext';
import { ParticipantService } from '@shared/services/ParticipantService';
import { TeamService } from '@shared/services/TeamService';
import { EventConfigService } from '@shared/services/EventConfigService';
import { SubmissionConfigService } from '@shared/services/SubmissionConfigService';
import { SubmissionService } from '@shared/services/SubmissionService';
import { RoundService } from '@shared/services/RoundService';
import type { Participant, Team, EventConfig, SubmissionField, Submission, RoundSubmissionConfig, Round } from '@shared/types/models';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Label } from '../../../components/ui/Form';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/ToastContext';
import { Code2, Send, Lock, AlertTriangle, Clock } from 'lucide-react';
import { ChangeRequestsPanel } from './ChangeRequestsPanel';
import { ChangeRequestService } from '@shared/services/ChangeRequestService';

const CountdownTimer = ({ targetDate }: { targetDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className="flex justify-between gap-2 mt-4 mb-2">
      {Object.entries(timeLeft).map(([unit, value]) => (
        <div key={unit} className="flex flex-col items-center w-full">
          <div className="bg-black/60 border border-primary/30 text-primary font-bebas text-4xl w-full h-16 flex items-center justify-center rounded-xl shadow-lg shadow-primary/10">
            {value.toString().padStart(2, '0')}
          </div>
          <span className="text-[10px] text-gray-400 font-inter uppercase tracking-wider mt-1">{unit}</span>
        </div>
      ))}
    </div>
  );
};

export default function ParticipantSubmission() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [profile, setProfile] = useState<Participant | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [roundConfig, setRoundConfig] = useState<RoundSubmissionConfig | null>(null);
  const [fieldsConfig, setFieldsConfig] = useState<SubmissionField[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [availableRounds, setAvailableRounds] = useState<Round[]>([]);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revisionExplanations, setRevisionExplanations] = useState<any[]>([]);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeRoundIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubProfile = ParticipantService.subscribeToParticipant(user.uid, (data) => setProfile(data));
    const unsubConfig = EventConfigService.subscribeToConfig((data) => {
      setConfig(data);
      setConfigLoaded(true);
    });
    
    return () => {
      unsubProfile();
      unsubConfig();
    };
  }, [user]);

  const [activeRoundId, setActiveRoundId] = useState<number | null>(null);

  useEffect(() => {
    activeRoundIdRef.current = activeRoundId;
  }, [activeRoundId]);

  useEffect(() => {
    const unsub = RoundService.subscribeToAllRounds((allRounds) => {
      const sortedRounds = allRounds.sort((a, b) => a.order - b.order);
      const validRounds = sortedRounds.filter(r => r.evaluationMode !== 'LIVE');
      
      setAvailableRounds(validRounds);
      
      if (validRounds.length === 0) {
        setActiveRoundId(null);
        setRound(null);
        setLoading(false);
        return;
      }

      const active = validRounds.find(r => r.status === 'SUBMISSION_OPEN' || r.status === 'SCHEDULED' || r.status === 'EVALUATION_OPEN');
      let currentId = activeRoundIdRef.current;
      
      if (!currentId || !validRounds.find(r => Number(r.id) === currentId)) {
        currentId = active ? Number(active.id) : Number(validRounds[0].id);
        setActiveRoundId(currentId);
      }
      
      const updatedRound = validRounds.find(r => Number(r.id) === currentId) || null;
      setRound(updatedRound);
      
      // If we are just updating the round status but no active round changed, loading might still need to be handled
      // but it's handled by the team/profile effects mostly. We can set it false if no team.
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (activeRoundId) {
      const unsubFields = SubmissionConfigService.subscribeToFields(activeRoundId, (data) => setFieldsConfig(data.filter(f => f.enabled)));
      const unsubRoundConfig = SubmissionConfigService.subscribeToRoundConfig(activeRoundId, (data) => setRoundConfig(data));
      
      return () => {
        unsubFields();
        unsubRoundConfig();
      };
    }
  }, [activeRoundId]);

  useEffect(() => {
    if (!profile || !configLoaded) return; // Wait for both profile and config to finish loading

    if (profile.teamId) {
      if (activeRoundId) {
        const unsubTeam = TeamService.subscribeToTeam(profile.teamId, (data) => setTeam(data));
        const unsubSubmission = SubmissionService.subscribeToTeamSubmission(profile.teamId, activeRoundId, (data) => {
          setSubmission(data);
          if (data) {
            SubmissionService.getLatestVersion(data.id, data.currentVersion || 1).then(version => {
              if (version && version.fields) {
                 setFormData(version.fields);
              }
              setLoading(false);
            });
          } else {
            setLoading(false);
          }
        });
        return () => {
          unsubTeam();
          unsubSubmission();
        };
      } else {
        // No activeRoundId yet
        const unsubTeam = TeamService.subscribeToTeam(profile.teamId, (data) => setTeam(data));
        setLoading(false);
        return () => unsubTeam();
      }
    } else {
      // Profile loaded, no team
      setLoading(false);
    }
  }, [profile, activeRoundId]);
  
  const validateUrl = (url: string, validationType?: string, customDomain?: string): boolean => {
    if (!url) return true;
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      
      switch (validationType) {
        case 'github': return hostname === 'github.com' || hostname.endsWith('.github.com');
        case 'youtube': return hostname === 'youtube.com' || hostname === 'youtu.be' || hostname.endsWith('.youtube.com');
        case 'gdrive': return hostname === 'drive.google.com';
        case 'figma': return hostname === 'figma.com' || hostname.endsWith('.figma.com');
        case 'devpost': return hostname === 'devpost.com' || hostname.endsWith('.devpost.com');
        case 'custom': 
          if (customDomain) {
            const domain = customDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
            return hostname === domain || hostname.endsWith(`.${domain}`);
          }
          return true;
        default: return true;
      }
    } catch {
      return false;
    }
  };

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const deadline = round?.submissionCloseAt ? new Date(round.submissionCloseAt) : null;
  const isPastDeadline = deadline ? now > deadline : false;

  const activeConfig = {
    enabled: true,
    maxRevisions: 2,
    allowDraftEditing: true,
    allowEditingAfterSubmission: false,
    autoLockAfterDeadline: true,
    allowLateSubmission: false,
    presentationRequired: true,
    ...(roundConfig || {}),
    maxRevisions: round?.maxRevisions ?? roundConfig?.maxRevisions ?? 2,
    allowLateSubmission: round?.allowLateSubmission ?? roundConfig?.allowLateSubmission ?? false,
  };
  
  const isCompleted = ['submitted', 'late', 'revision_submitted', 'under_review', 'evaluated'].includes(submission?.status || '');

  const isLocked = (() => {
    if (round?.status !== 'SUBMISSION_OPEN') return true;
    if (activeConfig.enabled === false) return true;
    if (activeConfig.allowDraftEditing === false && (!submission || submission.status === 'draft')) return true;
    if (submission?.status === 'locked') return true;
    if (team?.eliminated || team?.disqualified) return true;
    
    if (isCompleted && activeConfig.allowEditingAfterSubmission !== true) {
      if (activeConfig.maxRevisions <= (submission?.currentVersion || 1)) {
        return true;
      }
    }
    
    if (isPastDeadline) {
      if (activeConfig.allowLateSubmission === true) {
        return false;
      } else {
        if (!isCompleted) return true;
        if (activeConfig.autoLockAfterDeadline !== false) {
           return true;
        }
      }
    }
    
    return false;
  })();

  const autoSave = useCallback(async (data: Record<string, any>) => {
    if (!profile?.teamId || isLocked || !activeRoundId || team?.leaderId !== user?.uid) return;
    try {
      await SubmissionService.saveDraft(profile.teamId, activeRoundId, data, submission?.currentVersion || 0);
    } catch (err) {
      console.error('Autosave failed:', err);
    }
  }, [profile?.teamId, isLocked, activeRoundId, submission?.currentVersion, team?.leaderId, user?.uid]);

  const handleChange = (fieldId: string, value: string) => {
    const newData = { ...formData, [fieldId]: value };
    setFormData(newData);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(newData);
    }, 1000);
  };

  const handleSubmit = async () => {
    if (!profile?.teamId) return;
    
    for (const field of fieldsConfig) {
      const value = formData[field.id];
      if (field.required && !value) {
        error(`${field.name} is required`);
        return;
      }
      
      if (field.type === 'url' && value) {
        if (!validateUrl(value, field.urlValidation, field.customDomain)) {
          error(`Invalid URL for ${field.name}. Expected format: ${field.urlValidation === 'custom' ? field.customDomain : field.urlValidation}`);
          return;
        }
      }
      
      if (field.maxLength && value && value.length > field.maxLength) {
        error(`${field.name} exceeds maximum length of ${field.maxLength} characters.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const submitTime = new Date();
      let isLate = false;
      
      if (deadline && submitTime > deadline) {
        if (activeConfig.allowLateSubmission) {
          isLate = true;
        } else {
          error('Submission deadline has passed.');
          setIsSubmitting(false);
          return;
        }
      }
      
      if (submission?.status === 'changes_requested') {
        const changeSummary = "Revision submitted addressing previous feedback.";
        await SubmissionService.submitFinal(profile.teamId, activeRoundId!, formData, user!.uid, isLate, changeSummary);
        if (revisionExplanations.length > 0) {
          await ChangeRequestService.updateParticipantExplanations(revisionExplanations);
        }
      } else {
        await SubmissionService.submitFinal(profile.teamId, activeRoundId!, formData, user!.uid, isLate);
      }
      
      success('Project submitted successfully');
    } catch {
      error('Failed to submit project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoundChange = (roundId: number) => {
    setActiveRoundId(roundId);
    setRound(availableRounds.find(r => Number(r.id) === roundId) || null);
    setFormData({});
    setSubmission(null);
    setLoading(true);
  };

  if (loading) return null;

  if (!activeRoundId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Code2 className="w-16 h-16 text-primary mb-4 opacity-50" />
        <h2 className="text-2xl font-bebas text-white tracking-widest mb-2">NO SUBMISSIONS ACTIVE</h2>
        <p className="text-gray-400 font-inter">There are no digital submission rounds currently available.</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bebas text-white tracking-widest mb-2">NO TEAM ASSIGNED</h2>
        <p className="text-gray-400 font-inter">You must join or create a team before submitting a project.</p>
      </div>
    );
  }

  if (!team.trackId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bebas text-white tracking-widest mb-2">INCOMPLETE SELECTION</h2>
        <p className="text-gray-400 font-inter mb-6">Your team must select a track before you can submit your project.</p>
        <Button onClick={() => window.location.href = '/dashboard/tracks'}>
          SELECT TRACK
        </Button>
      </div>
    );
  }

  const isLeader = team.leaderId === user?.uid;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <Code2 className="w-8 h-8 text-primary" /> PROJECT SUBMISSION
          </h2>
          <p className="font-inter text-gray-400">Submit your project details for Round {activeRoundId || '1'}.</p>
        </div>
        
        {availableRounds.length > 1 && (
          <div className="flex items-center gap-3 bg-black/40 p-2.5 rounded-xl border border-white/10 shrink-0">
            <Label className="text-gray-400 whitespace-nowrap mb-0 text-xs uppercase tracking-wider">Select Round:</Label>
            <select
              value={activeRoundId || ''}
              onChange={(e) => handleRoundChange(Number(e.target.value))}
              className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-white font-bebas tracking-wide focus:outline-none focus:border-primary text-lg"
            >
              {availableRounds.map(r => (
                <option key={r.id} value={r.id}>Round {r.id}: {r.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="p-6 md:col-span-2">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-bebas text-2xl text-white">SUBMISSION DETAILS</h3>
              {submission?.updatedAt && <p className="text-sm text-gray-500 font-inter">Last saved: {new Date(submission.updatedAt).toLocaleString()}</p>}
              <div className="mt-4 flex flex-col gap-1">
                <p className="text-sm font-inter text-gray-400">Track: <span className="text-white font-medium">{team.track}</span></p>
                {team.problemId && (
                  <p className="text-sm font-inter text-gray-400">Problem ID: <span className="text-primary font-medium font-mono">{team.problemId}</span></p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {(!submission || submission?.status === 'not_started' || submission?.status === 'draft') && (
                 <Badge variant={isPastDeadline ? "danger" : "outline"}>
                   {isPastDeadline ? "NOT SUBMITTED" : "DRAFT (UNSUBMITTED)"}
                 </Badge>
              )}
              {['submitted', 'revision_submitted'].includes(submission?.status || '') && <Badge variant="success">SUBMITTED</Badge>}
              {submission?.status === 'late' && <Badge variant="warning">LATE SUBMISSION</Badge>}
              {submission?.status === 'revision_requested' && <Badge variant="warning">REVISION REQUESTED</Badge>}
              {submission?.status === 'under_review' && <Badge variant="primary">UNDER REVIEW</Badge>}
              {submission?.status === 'evaluated' && <Badge variant="success">EVALUATED</Badge>}
              {isLocked && !isCompleted && submission?.status !== 'locked' && <Badge variant="danger">LOCKED</Badge>}
              {submission?.status === 'locked' && <Badge variant="danger">LOCKED</Badge>}
            </div>
          </div>

          <div className="space-y-6">
            {fieldsConfig.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 font-inter">No submission fields configured for this round.</p>
              </div>
            ) : (
              fieldsConfig.map(field => {
                const value = formData[field.id] || '';
                const isOverMax = field.maxLength && value.length > field.maxLength;
                
                return (
                  <div key={field.id} className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-white flex items-center gap-2">
                        {field.name}
                        {field.required && <span className="text-red-400 text-xs">*</span>}
                        {field.type === 'url' && field.urlValidation !== 'any' && (
                          <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded font-mono uppercase">{field.urlValidation}</span>
                        )}
                      </Label>
                      {field.maxLength && (
                        <span className={`text-xs font-mono ${isOverMax ? 'text-red-400' : 'text-gray-500'}`}>
                          {value.length} / {field.maxLength}
                        </span>
                      )}
                    </div>
                    {field.description && <p className="text-xs text-gray-400 font-inter leading-relaxed">{field.description}</p>}
                    
                    {field.type === 'textarea' ? (
                      <textarea 
                        className={`w-full bg-black/50 border rounded-lg p-3 text-white focus:outline-none focus:ring-1 transition-all resize-y min-h-[120px] font-inter ${isOverMax ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-primary/50 focus:ring-primary/50'}`}
                        placeholder={field.placeholder}
                        value={value}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        disabled={isLocked || !isLeader}
                      />
                    ) : (
                      <Input 
                        type={field.type === 'url' ? 'url' : 'text'}
                        placeholder={field.placeholder}
                        value={value}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        disabled={isLocked || !isLeader}
                        className={`bg-black/50 ${isOverMax ? 'border-red-500/50 focus:border-red-500' : 'border-white/10'}`}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {submission?.status === 'changes_requested' && (
          <div className="md:col-span-2">
            <ChangeRequestsPanel 
              submissionId={submission.id}
              isLeader={isLeader}
              onExplanationsUpdate={setRevisionExplanations}
            />
          </div>
        )}

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-bebas text-xl text-white mb-4">ROUND {activeRoundId} STATUS</h3>
            <div className="space-y-4">
              {round?.submissionCloseAt && (
                <div className="pb-4 border-b border-white/10">
                  <span className="text-gray-400 font-inter text-sm block mb-1">Deadline</span>
                  <div className="flex items-center gap-2 text-white font-mono mb-2">
                    <Clock className={`w-4 h-4 ${isPastDeadline ? 'text-red-400' : 'text-primary'}`} />
                    <span className={isPastDeadline ? 'text-red-400' : ''}>
                      {new Date(round.submissionCloseAt).toLocaleString()}
                    </span>
                  </div>
                  {round.showCountdown && !isPastDeadline && round.status === 'SUBMISSION_OPEN' && (
                    <CountdownTimer targetDate={new Date(round.submissionCloseAt)} />
                  )}
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 font-inter">Window</span>
                {round?.status === 'SUBMISSION_OPEN' && roundConfig?.enabled ? (
                  <span className="text-green-400 font-mono">OPEN</span>
                ) : (
                  <span className="text-red-400 font-mono">CLOSED</span>
                )}
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 font-inter">Editing</span>
                {!isLocked ? (
                  <span className="text-green-400 font-mono">ALLOWED</span>
                ) : (
                  <span className="text-red-400 font-mono">LOCKED</span>
                )}
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 font-inter">Attempts Used</span>
                <span className="text-white font-mono">
                  {isCompleted ? submission?.currentVersion || 1 : 0} / {activeConfig.maxRevisions}
                </span>
              </div>
              {activeConfig.allowLateSubmission && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 font-inter">Late Submissions</span>
                  <span className="text-yellow-400 font-mono">ALLOWED</span>
                </div>
              )}
            </div>
          </Card>

          {!isLocked && fieldsConfig.length > 0 && isLeader && (
            <div className="space-y-3">
              <Button 
                variant="primary" 
                className="w-full font-bebas tracking-widest text-lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? 'SUBMITTING...' : isCompleted ? `SUBMIT REVISION (${(submission?.currentVersion || 1) + 1} OF ${activeConfig.maxRevisions})` : `SUBMIT FINAL (ATTEMPT 1 OF ${activeConfig.maxRevisions})`}
              </Button>
              <p className="text-center text-xs text-gray-500 font-inter mt-2">
                Drafts are saved automatically as you type.
              </p>
            </div>
          )}

          {!isLeader && !isLocked && (
             <Card className="p-4 bg-yellow-500/10 border-yellow-500/30 flex items-start gap-3 mt-4">
               <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
               <div>
                 <h4 className="font-bebas text-yellow-400">VIEW ONLY</h4>
                 <p className="text-xs text-yellow-300/80 font-inter mt-1">
                   Only the Team Leader can edit and submit the project. You are viewing the live draft.
                 </p>
               </div>
             </Card>
          )}
          
          {isLocked && (
            <Card className="p-4 bg-red-500/10 border-red-500/30 flex items-start gap-3 mt-4">
              <Lock className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bebas text-red-400">SUBMISSION LOCKED</h4>
                <p className="text-xs text-red-300/80 font-inter mt-1">
                  {team?.disqualified ? 'Your team has been disqualified.' : 
                   team?.eliminated ? `Your team was eliminated. Reason: ${team.eliminationReason || 'N/A'}` : 
                   isPastDeadline && (!submission || submission.status === 'draft' || submission.status === 'not_started') ? 
                   'The deadline has passed and your draft was NOT submitted. It will not be evaluated.' :
                   'You cannot edit your submission at this time.'}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

