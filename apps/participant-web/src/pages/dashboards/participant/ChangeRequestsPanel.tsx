import React, { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Select, Input } from '../../../components/ui/Form';
import { ChangeRequestService } from '@shared/services/ChangeRequestService';
import type { ChangeRequest } from '@shared/types/models';
import { MessageSquare, AlertCircle } from 'lucide-react';

interface ChangeRequestsPanelProps {
  submissionId: string;
  isLeader: boolean;
  onExplanationsUpdate: (updates: { id: string, status: ChangeRequest['status'], explanation?: string }[]) => void;
}

export function ChangeRequestsPanel({ submissionId, isLeader, onExplanationsUpdate }: ChangeRequestsPanelProps) {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [explanations, setExplanations] = useState<Record<string, { status: ChangeRequest['status'], explanation: string }>>({});

  useEffect(() => {
    const unsub = ChangeRequestService.subscribeToRequestsForSubmission(submissionId, (data) => {
      // Only show OPEN or ACKNOWLEDGED requests that need attention, 
      // or all of them so they can see history. Let's show all for this version.
      setRequests(data);
      const init: Record<string, any> = {};
      data.forEach(r => {
        init[r.id] = { status: r.status === 'OPEN' ? 'IMPLEMENTED' : r.status, explanation: r.participantExplanation || '' };
      });
      setExplanations(init);
    });
    return unsub;
  }, [submissionId]);

  useEffect(() => {
    onExplanationsUpdate(
      Object.entries(explanations).map(([id, val]) => ({ id, status: val.status, explanation: val.explanation }))
    );
  }, [explanations]);

  const handleChange = (id: string, field: 'status' | 'explanation', value: string) => {
    setExplanations(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  if (requests.length === 0) return null;

  return (
    <Card className="p-6 border-yellow-500/30 bg-yellow-500/5">
      <div className="flex items-center gap-2 mb-6">
        <AlertCircle className="w-6 h-6 text-yellow-400" />
        <h3 className="font-bebas text-2xl text-yellow-400 tracking-wider">CHANGES REQUESTED</h3>
      </div>
      <p className="text-gray-400 font-inter text-sm mb-6">
        The judging panel has requested the following changes to your submission. Please address them and provide an explanation before submitting your revision.
      </p>

      <div className="space-y-6">
        {requests.map((req, idx) => (
          <div key={req.id} className="bg-black/40 rounded-lg p-4 border border-white/5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={req.priority === 'CRITICAL' || req.priority === 'HIGH' ? 'danger' : 'outline'}>{req.priority}</Badge>
                  <span className="text-white font-bebas text-lg tracking-wider">{req.title}</span>
                </div>
                <p className="text-sm text-gray-300 font-inter">{req.description}</p>
              </div>
              <Badge variant="warning">{req.category}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Resolution Status</label>
                <Select 
                  value={explanations[req.id]?.status || 'IMPLEMENTED'}
                  onChange={(e) => handleChange(req.id, 'status', e.target.value)}
                  disabled={!isLeader}
                >
                  <option value="IMPLEMENTED">Implemented</option>
                  <option value="PARTIALLY_IMPLEMENTED">Partially Implemented</option>
                  <option value="NOT_IMPLEMENTED">Not Implemented</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Developer Explanation</label>
                <Input 
                  placeholder="Explain what you changed..."
                  value={explanations[req.id]?.explanation || ''}
                  onChange={(e) => handleChange(req.id, 'explanation', e.target.value)}
                  disabled={!isLeader}
                  required
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
