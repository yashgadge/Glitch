import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Label, Select } from '../../../components/ui/Form';
import { Plus, Trash2, MessageSquare, AlertCircle } from 'lucide-react';
import type { ChangeRequest } from '@shared/types/models';
import { useAuth } from '@shared/contexts/AuthContext';
import { ChangeRequestService } from '@shared/services/ChangeRequestService';
import { SubmissionService } from '@shared/services/SubmissionService';

interface ChangeRequestFormProps {
  submissionId: string;
  submissionVersionId: string;
  teamId: string;
  roundId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChangeRequestForm({ submissionId, submissionVersionId, teamId, roundId, onClose, onSuccess }: ChangeRequestFormProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Partial<ChangeRequest>[]>([
    {
      title: '',
      description: '',
      category: 'FUNCTIONALITY',
      priority: 'MEDIUM',
    }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addRequest = () => {
    setRequests([...requests, { title: '', description: '', category: 'FUNCTIONALITY', priority: 'MEDIUM' }]);
  };

  const removeRequest = (index: number) => {
    setRequests(requests.filter((_, i) => i !== index));
  };

  const updateRequest = (index: number, field: keyof ChangeRequest, value: string) => {
    const updated = [...requests];
    updated[index] = { ...updated[index], [field]: value };
    setRequests(updated);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const validRequests = requests.filter(r => r.title && r.description).map(r => ({
        ...r,
        roundId,
        teamId,
        submissionId,
        versionId: submissionVersionId,
        status: 'OPEN' as const,
        createdByUid: user.uid,
        createdByRole: 'judge',
      })) as Omit<ChangeRequest, 'id' | 'createdAt'>[];

      if (validRequests.length > 0) {
        await ChangeRequestService.createRequests(validRequests);
        // Also need to set the submission status to 'changes_requested'
        await SubmissionService.updateStatus(submissionId, 'changes_requested');
      }
      
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 border-yellow-500/30 bg-yellow-500/5 mt-6">
      <div className="flex items-center gap-2 mb-6">
        <AlertCircle className="w-6 h-6 text-yellow-400" />
        <h3 className="font-bebas text-2xl text-yellow-400 tracking-wider">REQUEST REVISIONS</h3>
      </div>
      <p className="text-gray-400 font-inter text-sm mb-6">
        Define specific changes you require from the team. They will not be able to submit a final evaluation until they provide an explanation for each item.
      </p>

      <div className="space-y-6">
        {requests.map((req, idx) => (
          <div key={idx} className="bg-black/40 rounded-lg p-4 border border-white/5 space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-bebas text-lg text-white">CHANGE REQUEST #{idx + 1}</h4>
              {requests.length > 1 && (
                <button onClick={() => removeRequest(idx)} className="text-red-400 hover:text-red-300">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input 
                  value={req.title} 
                  onChange={(e) => updateRequest(idx, 'title', e.target.value)} 
                  placeholder="e.g. Fix authentication bypass"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={req.category} onChange={(e) => updateRequest(idx, 'category', e.target.value)}>
                    <option value="FUNCTIONALITY">Functionality</option>
                    <option value="UI_UX">UI / UX</option>
                    <option value="PERFORMANCE">Performance</option>
                    <option value="SECURITY">Security</option>
                    <option value="DOCUMENTATION">Documentation</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={req.priority} onChange={(e) => updateRequest(idx, 'priority', e.target.value)}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </Select>
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <textarea 
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white font-inter focus:border-primary transition-colors"
                  placeholder="Provide clear, actionable feedback..."
                  value={req.description}
                  onChange={(e) => updateRequest(idx, 'description', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-4 pt-4 border-t border-white/10">
        <Button variant="outline" onClick={addRequest} className="flex-1">
          <Plus className="w-4 h-4 mr-2" /> ADD ANOTHER REQUEST
        </Button>
      </div>
      <div className="mt-6 flex justify-end gap-4">
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>CANCEL</Button>
        <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting} disabled={requests.some(r => !r.title || !r.description)}>
          <MessageSquare className="w-4 h-4 mr-2" /> SEND REQUESTS
        </Button>
      </div>
    </Card>
  );
}
