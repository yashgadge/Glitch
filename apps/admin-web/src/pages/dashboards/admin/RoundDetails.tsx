import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Calendar, Clock, CheckSquare, Settings, 
  Users, Trophy, AlertTriangle, Play, Lock, ChevronRight,
  Shield, FileUp, Activity, ChevronDown, StopCircle
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Select, Checkbox, Label } from '../../../components/ui/Form';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/ToastContext';
import { RoundService } from '@shared/services/RoundService';
import { EvaluationService } from '@shared/services/EvaluationService';
import type { Round, RoundStatus, CriterionTemplate } from '@shared/types/models';

export default function RoundDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();
  
  const [round, setRound] = useState<Round | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Progressive disclosure states
  const [showAdvancedSubmission, setShowAdvancedSubmission] = useState(false);
  
  // Criteria State
  const [criteria, setCriteria] = useState<CriterionTemplate[]>([]);

  const [isSavingCriteria, setIsSavingCriteria] = useState(false);

  useEffect(() => {
    if (id) {
      loadRound(id);
      
      const unsub = EvaluationService.subscribeToCriteria(Number(id), (data) => {
        setCriteria(data);
      });
      

      
      return () => unsub();
    }
  }, [id]);

  const loadRound = async (roundId: string) => {
    try {
      setIsLoading(true);
      const rounds = await RoundService.getAllRounds();
      const found = rounds.find(r => r.id === roundId || r.id === Number(roundId) as any);
      if (found) {
        setRound(found);
      } else {
        error('Round not found');
        navigate('/workspace/rounds');
      }
    } catch (err) {
      error('Failed to load round details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (updates: Partial<Round>) => {
    if (!round) return;
    try {
      setIsSaving(true);
      
      // Clean undefined fields just in case
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );

      await RoundService.updateRound(round.id, cleanUpdates);
      setRound({ ...round, ...cleanUpdates });
      success('Changes saved successfully');
    } catch (err: any) {
      error(`Failed to save changes: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCriteria = (index: number, field: string, value: any) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    setCriteria(updated);
  };

  const handleSaveCriteria = async () => {
    if (!round) return;
    
    // Validate duplicates
    const names = new Set();
    const orders = new Set();
    for (const c of criteria) {
      if (names.has(c.name.toLowerCase().trim())) {
        return error(`Duplicate criteria name found: ${c.name}`);
      }
      if (orders.has(c.order)) {
        return error(`Duplicate display order found: ${c.order}`);
      }
      names.add(c.name.toLowerCase().trim());
      orders.add(c.order);
    }

    const totalScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
    if (totalScore !== 100) {
      // Just warn, don't block. Wait, user said "show a warning". So we just let them save.
    }

    setIsSavingCriteria(true);
    try {
      await EvaluationService.updateCriteria(Number(round.id), criteria);
      success('Criteria Saved');
    } catch (err: any) {
      error(`Failed to save criteria: ${err.message}`);
    } finally {
      setIsSavingCriteria(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-32 bg-white/5 rounded" />
        <div className="h-24 bg-white/5 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-white/5 rounded-xl" />
          <div className="h-64 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!round) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-20 max-w-6xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/workspace/rounds')} className="px-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            {round.name}
          </h2>
          <div className="flex items-center gap-3 text-sm font-inter mt-1">
            <span className="text-gray-400">{round.displayName}</span>
            <span className="text-gray-600">•</span>
            <span className="text-primary">{round.type}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          
          {/* Lifecycle Actions */}
          {round.status === 'DRAFT' && (
            <Button variant="outline" onClick={() => handleUpdate({ status: 'PUBLISHED' })} disabled={isSaving} className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 whitespace-nowrap">
              PUBLISH ROUND
            </Button>
          )}

          {round.evaluationMode !== 'LIVE' && (round.status === 'PUBLISHED' || round.status === 'SUBMISSION_CLOSED') && (
            <Button variant="outline" onClick={() => handleUpdate({ status: 'SUBMISSION_OPEN' })} disabled={isSaving} leftIcon={Play} className="border-green-500/50 text-green-400 hover:bg-green-500/10 whitespace-nowrap">
              START SUBMISSIONS
            </Button>
          )}
          
          {round.evaluationMode !== 'LIVE' && round.status === 'SUBMISSION_OPEN' && (
            <Button variant="outline" onClick={() => handleUpdate({ status: 'SUBMISSION_CLOSED' })} disabled={isSaving} leftIcon={StopCircle} className="border-red-500/50 text-red-400 hover:bg-red-500/10 whitespace-nowrap">
              STOP SUBMISSIONS
            </Button>
          )}

          {(round.status === 'PUBLISHED' || round.status === 'SUBMISSION_CLOSED' || round.status === 'EVALUATION_CLOSED') && (
            <Button variant="outline" onClick={() => handleUpdate({ status: 'EVALUATION_OPEN' })} disabled={isSaving} leftIcon={Play} className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 whitespace-nowrap">
              START EVALUATION
            </Button>
          )}

          {round.status === 'EVALUATION_OPEN' && (
            <Button variant="outline" onClick={() => handleUpdate({ status: 'EVALUATION_CLOSED' })} disabled={isSaving} leftIcon={StopCircle} className="border-red-500/50 text-red-400 hover:bg-red-500/10 whitespace-nowrap">
              STOP EVALUATION
            </Button>
          )}

          <Badge variant={round.status === 'DRAFT' ? 'default' : 'success'} className="text-sm px-4 py-1 h-fit">
            ● {round.status}
          </Badge>
        </div>
      </div>

      {/* Overview Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card className="p-4 bg-black/40">
          <div className="text-gray-400 text-xs font-bebas tracking-wider mb-1">QUALIFIED TEAMS</div>
          <div className="text-2xl font-bold">{round.qualifiedCount || 0}</div>
        </Card>
        <Card className="p-4 bg-black/40">
          <div className="text-gray-400 text-xs font-bebas tracking-wider mb-1">SUBMISSIONS</div>
          <div className="text-2xl font-bold">0 <span className="text-sm text-gray-500 font-normal">/ {round.qualifiedCount || 0}</span></div>
        </Card>
        <Card className="p-4 bg-black/40">
          <div className="text-gray-400 text-xs font-bebas tracking-wider mb-1">EVALUATIONS</div>
          <div className="text-2xl font-bold">0% <span className="text-sm text-gray-500 font-normal">complete</span></div>
        </Card>
        <Card className="p-4 bg-black/40">
          <div className="text-gray-400 text-xs font-bebas tracking-wider mb-1">LIFECYCLE</div>
          <div className="text-sm font-medium text-white flex items-center gap-2 mt-1">
            {round.status === 'DRAFT' ? 'Not Started' : 'Active'}
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Configuration */}
        <div className="xl:col-span-2 space-y-6">
          
          <h3 className="font-bebas text-2xl tracking-wider text-white border-b border-white/10 pb-2">
            CONFIGURATION
          </h3>

          {/* Submission Configuration */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 h-fit">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bebas text-xl tracking-wider text-white">Submission Rules</h4>
                    <p className="text-sm text-gray-400 font-inter">Configure how teams submit their work.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Submitter Role</Label>
                    <Select defaultValue="leader">
                      <option value="leader">Team Leader Only</option>
                      <option value="any">Any Team Member</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Base Revision Limit</Label>
                    <Input 
                      type="number" 
                      defaultValue={round.maxRevisions ?? 2} 
                      onChange={(e) => handleUpdate({ maxRevisions: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAdvancedSubmission(!showAdvancedSubmission)}
                    className="text-sm text-primary hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    Advanced Rules {showAdvancedSubmission ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>

                {showAdvancedSubmission && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-black/30 rounded-lg border border-white/5 space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        defaultChecked={round.allowLateSubmission} 
                        onChange={(e) => handleUpdate({ allowLateSubmission: (e.target as HTMLInputElement).checked })}
                      />
                      <div>
                        <Label className="mb-0">Allow Late Submissions</Label>
                        <p className="text-xs text-gray-500">Submissions after deadline will be flagged but accepted.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Evaluation Configuration */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 h-fit">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bebas text-xl tracking-wider text-white">Evaluation Rules & Criteria</h4>
                    <p className="text-sm text-gray-400 font-inter">Configure judging criteria for this round.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end mr-4">
                    <span className="text-xs font-mono text-gray-500 uppercase">Total Score</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bebas text-2xl ${criteria.reduce((s,c) => s + (c.maxScore||0), 0) !== 100 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {criteria.reduce((s,c) => s + (c.maxScore||0), 0)}
                      </span>
                      <span className="text-sm font-mono text-gray-500">/ 100</span>
                    </div>
                    {criteria.reduce((s,c) => s + (c.maxScore||0), 0) !== 100 && (
                      <span className="text-[10px] text-yellow-500">⚠ Should equal 100</span>
                    )}
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={handleSaveCriteria}
                    isLoading={isSavingCriteria}
                  >
                    Save Criteria
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Evaluation Mode</Label>
                    <Select 
                      value={round.evaluationMode || 'SUBMISSION'} 
                      onChange={(e) => handleUpdate({ evaluationMode: e.target.value as any })}
                    >
                      <option value="SUBMISSION">Digital Submission (Default)</option>
                      <option value="LIVE">Live / Offline Presentation</option>
                      <option value="BOTH">Both (Submission + Live)</option>
                    </Select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#111] border-b border-white/10 text-xs text-gray-400 uppercase font-inter tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3 w-1/3">Criterion Name</th>
                        <th className="px-4 py-3">Max Score</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {criteria.map((c, index) => (
                        <tr key={c.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={c.order}
                              onChange={(e) => handleUpdateCriteria(index, 'order', Number(e.target.value))}
                              className="w-20 h-8"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={c.name}
                              onChange={(e) => handleUpdateCriteria(index, 'name', e.target.value)}
                              className="w-full h-8"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={c.maxScore}
                              onChange={(e) => handleUpdateCriteria(index, 'maxScore', Number(e.target.value))}
                              className="w-24 h-8"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={c.enabled ? 'true' : 'false'}
                              onChange={(e) => handleUpdateCriteria(index, 'enabled', e.target.value === 'true')}
                              className="bg-black/30 border border-white/10 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-primary/50 font-inter text-sm disabled:opacity-50"
                            >
                              <option value="true" className="bg-[#111]">Enabled</option>
                              <option value="false" className="bg-[#111]">Disabled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                      {criteria.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-gray-500">
                            No criteria defined. Add them from the global defaults or manually.
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2"
                                onClick={() => {
                                  const defaults: CriterionTemplate[] = [
                                    { id: 'innovation', name: 'Innovation', maxScore: 20, order: 1, enabled: true },
                                    { id: 'tech_impl', name: 'Technical Implementation', maxScore: 20, order: 2, enabled: true },
                                    { id: 'ui_ux', name: 'UI / UX', maxScore: 20, order: 3, enabled: true },
                                    { id: 'presentation', name: 'Presentation', maxScore: 20, order: 4, enabled: true },
                                    { id: 'scalability', name: 'Scalability', maxScore: 20, order: 5, enabled: true },
                                  ];
                                  setCriteria(defaults);
                                }}
                              >
                                LOAD DEFAULTS
                              </Button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </motion.div>

        </div>

        {/* Right Column: Timeline & Operations */}
        <div className="space-y-6">
          
          <h3 className="font-bebas text-2xl tracking-wider text-white border-b border-white/10 pb-2">
            TIMELINE
          </h3>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                
                {/* Submission Open */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-white/10 bg-black text-gray-500 group-hover:border-primary group-hover:text-primary transition-colors shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                    <FileUp className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/5 bg-black/40">
                    <div className="text-xs font-bebas text-primary tracking-wider mb-1">SUBMISSION OPENS</div>
                    <Input 
                      type="datetime-local" 
                      className="h-8 text-sm cursor-pointer w-full min-w-0"
                      style={{ paddingRight: '4px' }}
                      defaultValue={round.submissionOpenAt ? new Date(round.submissionOpenAt).toISOString().slice(0, 16) : ''}
                      onBlur={(e) => handleUpdate({ submissionOpenAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      onClick={(e) => {
                        try {
                          (e.target as HTMLInputElement).showPicker();
                        } catch (err) {}
                      }}
                    />
                  </div>
                </div>

                {/* Submission Close */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-white/10 bg-black text-gray-500 group-hover:border-red-500 group-hover:text-red-500 transition-colors shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/5 bg-black/40">
                    <div className="text-xs font-bebas text-red-400 tracking-wider mb-1">DEADLINE</div>
                    <Input 
                      type="datetime-local" 
                      className="h-8 text-sm cursor-pointer w-full min-w-0"
                      style={{ paddingRight: '4px' }}
                      defaultValue={round.submissionCloseAt ? new Date(round.submissionCloseAt).toISOString().slice(0, 16) : ''}
                      onBlur={(e) => handleUpdate({ submissionCloseAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      onClick={(e) => {
                        try {
                          (e.target as HTMLInputElement).showPicker();
                        } catch (err) {}
                      }}
                    />
                  </div>
                </div>

                {/* Evaluation Open */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-white/10 bg-black text-gray-500 group-hover:border-purple-500 group-hover:text-purple-500 transition-colors shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/5 bg-black/40">
                    <div className="text-xs font-bebas text-purple-400 tracking-wider mb-1">EVALUATION OPENS</div>
                    <Input 
                      type="datetime-local" 
                      className="h-8 text-sm cursor-pointer w-full min-w-0"
                      style={{ paddingRight: '4px' }}
                      defaultValue={round.evaluationOpenAt ? new Date(round.evaluationOpenAt).toISOString().slice(0, 16) : ''}
                      onBlur={(e) => handleUpdate({ evaluationOpenAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      onClick={(e) => {
                        try {
                          (e.target as HTMLInputElement).showPicker();
                        } catch (err) {}
                      }}
                    />
                  </div>
                </div>

              </div>
            </Card>
          </motion.div>



          <h3 className="font-bebas text-2xl tracking-wider text-white border-b border-white/10 pb-2 mt-8">
            OPERATIONS
          </h3>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-4"
          >
            <Card className="p-4 flex items-center justify-between hover:border-white/20 transition-colors cursor-pointer group" onClick={() => navigate('/workspace/staff')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bebas text-lg tracking-wider text-white">JUDGES</div>
                  <div className="text-xs text-gray-500">Manage Assignments</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                MANAGE
              </Button>
            </Card>

            <Card className="p-4 flex items-center justify-between hover:border-white/20 transition-colors cursor-pointer group" onClick={() => navigate('/workspace/staff')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bebas text-lg tracking-wider text-white">VOLUNTEERS</div>
                  <div className="text-xs text-gray-500">Manage Assignments</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                MANAGE
              </Button>
            </Card>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
