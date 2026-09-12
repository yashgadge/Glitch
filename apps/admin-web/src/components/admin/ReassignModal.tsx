import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SearchableSelect } from '../ui/SearchableSelect';
import type { Staff, Team } from '@shared/types/models';

interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newJudgeId: string) => void;
  team: Team | null;
  currentJudge: Staff | null;
  judges: Staff[];
  workloads: Record<string, number>;
  isAssigning: boolean;
}

export function ReassignModal({ isOpen, onClose, onConfirm, team, currentJudge, judges, workloads, isAssigning }: ReassignModalProps) {
  const [selectedJudge, setSelectedJudge] = useState('');

  if (!team || !currentJudge) return null;

  // Don't show the current judge in the reassignment options
  const eligibleJudges = judges.filter(j => j.id !== currentJudge.id);
  const judgeOptions = eligibleJudges.map(j => ({ 
    value: j.id, 
    label: j.name, 
    subLabel: `${j.id} (Load: ${workloads[j.id] || 0})` 
  }));

  const handleConfirm = () => {
    if (selectedJudge) {
      onConfirm(selectedJudge);
      setSelectedJudge('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Swap Judge">
      <div className="space-y-6">
        <div className="bg-black/50 p-4 rounded-lg border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
            <span className="text-gray-400 uppercase tracking-widest text-xs">Team</span>
            <span className="text-white font-medium">{team.name}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400 uppercase tracking-widest text-xs">Current Judge</span>
            <span className="text-red-400 font-medium">{currentJudge.name}</span>
          </div>
        </div>

        <div className="space-y-2 relative z-50">
          <label className="text-sm text-gray-300">Select New Judge</label>
          <SearchableSelect
            options={judgeOptions}
            value={selectedJudge}
            onChange={setSelectedJudge}
            placeholder="-- Choose Replacement --"
          />
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <Button variant="outline" onClick={onClose} disabled={isAssigning}>
            CANCEL
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={isAssigning || !selectedJudge}>
            {isAssigning ? 'SWAPPING...' : 'SWAP JUDGE'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
