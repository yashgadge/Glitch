import React, { useState, useMemo } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input, Label } from '../../../components/ui/Form';
import { Badge } from '../../../components/ui/Badge';
import { Edit3, Unlock, AlertTriangle, Save, X } from 'lucide-react';
import type { Evaluation, Team, CriterionTemplate } from '@shared/types/models';
import { useToast } from '../../../components/ui/ToastContext';

interface EvaluationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: Evaluation;
  team: Team;
  criteria: CriterionTemplate[];
  onReopen: (reason: string) => Promise<void>;
  onCorrect: (scores: Record<string, number>, newTotal: number, reason: string) => Promise<void>;
}

export function EvaluationDetailModal({
  isOpen,
  onClose,
  evaluation,
  team,
  criteria,
  onReopen,
  onCorrect
}: EvaluationDetailModalProps) {
  const { success, error: toastError } = useToast();
  const [mode, setMode] = useState<'view' | 'reopen' | 'correct'>('view');
  const [reason, setReason] = useState('');
  const [editedScores, setEditedScores] = useState<Record<string, number>>(evaluation.criteriaScores || {});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when opened or evaluation changes
  React.useEffect(() => {
    if (isOpen) {
      setMode('view');
      setReason('');
      setEditedScores(evaluation.criteriaScores || {});
    }
  }, [isOpen, evaluation]);

  const currentTotal = useMemo(() => {
    return Object.values(editedScores).reduce((sum, score) => sum + (Number(score) || 0), 0);
  }, [editedScores]);

  const maxTotal = useMemo(() => {
    return criteria.reduce((sum, c) => sum + c.maxScore, 0);
  }, [criteria]);

  const handleScoreChange = (criterionId: string, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    setEditedScores(prev => ({
      ...prev,
      [criterionId]: num
    }));
  };

  const handleReopenSubmit = async () => {
    if (!reason.trim()) {
      toastError('Reason Required', 'You must provide a reason to reopen an evaluation.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onReopen(reason);
      success('Evaluation Reopened', 'The judge can now modify their score.');
      onClose();
    } catch (err: any) {
      toastError('Failed to reopen', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCorrectSubmit = async () => {
    if (!reason.trim()) {
      toastError('Reason Required', 'You must provide a reason for correcting an evaluation.');
      return;
    }
    // Validate scores
    for (const criterion of criteria) {
      const score = editedScores[criterion.id] || 0;
      if (score < 0 || score > criterion.maxScore) {
        toastError('Invalid Score', `${criterion.name} score must be between 0 and ${criterion.maxScore}`);
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
      await onCorrect(editedScores, currentTotal, reason);
      success('Evaluation Corrected', 'The scorecard has been successfully updated.');
      onClose();
    } catch (err: any) {
      toastError('Correction Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <div className="flex justify-between items-start pr-8 mb-6">
        <div>
          <h2 className="font-bebas text-2xl tracking-wider text-white">
            Evaluation Detail
          </h2>
          <p className="font-mono text-xs text-primary mt-1">
            {team.id} • {team.name}
          </p>
        </div>
        <div className="flex gap-2">
          {evaluation.locked ? (
             <Badge variant="danger">Locked</Badge>
          ) : evaluation.status === 'submitted' ? (
             <Badge variant="success">Submitted</Badge>
          ) : evaluation.status === 'reopened' ? (
             <Badge variant="warning">Reopened</Badge>
          ) : (
             <Badge variant="warning">Draft</Badge>
          )}
          <Badge variant="outline" className="font-mono">
             Judge: {evaluation.judgeId}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* View Mode */}
        {mode === 'view' && (
          <div className="space-y-6">
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                 <h4 className="font-bebas text-xl text-white tracking-widest">Scorecard</h4>
                 <div className="text-right">
                   <div className="font-bebas text-3xl text-primary">{evaluation.totalScore} <span className="text-xl text-gray-500">/ {maxTotal}</span></div>
                   <div className="text-xs font-mono text-gray-500">TOTAL SCORE</div>
                 </div>
              </div>
              
              <div className="space-y-3">
                {criteria.map(criterion => {
                  const score = evaluation.criteriaScores?.[criterion.id] || 0;
                  return (
                    <div key={criterion.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                      <div>
                        <div className="font-medium text-white">{criterion.name}</div>
                        {criterion.description && <div className="text-xs text-gray-400 mt-1 max-w-md">{criterion.description}</div>}
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <span className="font-bebas text-xl text-white">{score}</span>
                        <span className="text-gray-500 font-inter text-sm"> / {criterion.maxScore}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {evaluation.feedback && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/5">
                  <h5 className="text-xs font-mono text-gray-500 uppercase mb-2">Judge Feedback</h5>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{evaluation.feedback}</p>
                </div>
              )}
            </div>

            {/* Admin Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
               {(evaluation.locked || evaluation.status === 'submitted') && (
                 <Button variant="outline" leftIcon={Unlock} onClick={() => setMode('reopen')}>
                   Reopen Evaluation
                 </Button>
               )}
               <Button variant="danger" leftIcon={Edit3} onClick={() => setMode('correct')}>
                 Admin Correction
               </Button>
            </div>
          </div>
        )}

        {/* Reopen Mode */}
        {mode === 'reopen' && (
          <div className="space-y-6">
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl flex gap-4 text-yellow-500">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div className="text-sm">
                <p className="font-medium mb-1">You are about to reopen this evaluation.</p>
                <p className="text-yellow-500/80">The judge will be notified and they can modify their scores. This action requires a documented reason.</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Reason for Reopening <span className="text-red-500">*</span></Label>
              <Input 
                value={reason} 
                onChange={(e) => setReason(e.target.value)} 
                placeholder="e.g. Judge accidentally submitted before finishing..."
                autoFocus
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setMode('view')} disabled={isSubmitting}>Cancel</Button>
              <Button variant="primary" leftIcon={Unlock} onClick={handleReopenSubmit} isLoading={isSubmitting}>Reopen Evaluation</Button>
            </div>
          </div>
        )}

        {/* Correct Mode */}
        {mode === 'correct' && (
          <div className="space-y-6">
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex gap-4 text-red-500">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div className="text-sm">
                <p className="font-medium mb-1">Administrative Score Correction</p>
                <p className="text-red-500/80">You are directly modifying the judge's submitted scores. This action is irreversible, will recalculate the total, and will be logged in the audit trail.</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {criteria.map(criterion => {
                const score = editedScores[criterion.id] || 0;
                return (
                  <div key={criterion.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                    <div>
                      <div className="font-medium text-white">{criterion.name}</div>
                      <div className="text-xs text-gray-400">Max: {criterion.maxScore}</div>
                    </div>
                    <div className="w-24">
                      <Input 
                        type="number" 
                        min={0} 
                        max={criterion.maxScore} 
                        value={score} 
                        onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                        className="text-right"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-between items-center p-4 bg-black/40 border border-white/10 rounded-lg">
              <span className="font-mono text-sm text-gray-400">NEW TOTAL</span>
              <div className="font-bebas text-3xl text-primary">{currentTotal} <span className="text-xl text-gray-500">/ {maxTotal}</span></div>
            </div>

            <div className="space-y-2">
              <Label>Reason for Correction <span className="text-red-500">*</span></Label>
              <Input 
                value={reason} 
                onChange={(e) => setReason(e.target.value)} 
                placeholder="e.g. Judge entered incorrect Presentation score..."
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setMode('view')} disabled={isSubmitting}>Cancel</Button>
              <Button variant="danger" leftIcon={Save} onClick={handleCorrectSubmit} isLoading={isSubmitting}>Save Correction</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
