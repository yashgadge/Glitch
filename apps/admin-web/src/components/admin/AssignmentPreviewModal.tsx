import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface AssignmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  previewData: {
    roundId: number;
    totalTeamsProcessed: number;
    totalJudgesUsed: number;
    assignmentsToCreate: number;
    assignmentsToRemove: number;
    existingKept: number;
    unassignedCount: number;
    warnings: string[];
  } | null;
  isApplying: boolean;
}

export function AssignmentPreviewModal({ isOpen, onClose, onConfirm, previewData, isApplying }: AssignmentPreviewModalProps) {
  if (!previewData) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assignment Preview">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/50 p-4 rounded-lg border border-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Teams</div>
            <div className="text-2xl text-white font-bebas tracking-wider">{previewData.totalTeamsProcessed}</div>
          </div>
          <div className="bg-black/50 p-4 rounded-lg border border-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Judges Used</div>
            <div className="text-2xl text-white font-bebas tracking-wider">{previewData.totalJudgesUsed}</div>
          </div>
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <div className="text-xs text-primary/80 uppercase tracking-widest mb-1">New Assignments</div>
            <div className="text-2xl text-primary font-bebas tracking-wider">+{previewData.assignmentsToCreate}</div>
          </div>
          <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20">
            <div className="text-xs text-red-400 uppercase tracking-widest mb-1">To Remove</div>
            <div className="text-2xl text-red-500 font-bebas tracking-wider">-{previewData.assignmentsToRemove}</div>
          </div>
        </div>

        <div className="flex justify-between text-sm py-3 border-y border-white/10">
          <span className="text-gray-400">Existing Assignments Kept</span>
          <span className="text-white font-mono">{previewData.existingKept}</span>
        </div>

        <div className="flex justify-between text-sm py-3 border-b border-white/10">
          <span className="text-gray-400">Unassigned after operation</span>
          <span className={`font-mono ${previewData.unassignedCount > 0 ? 'text-red-400 font-bold' : 'text-green-400'}`}>
            {previewData.unassignedCount}
          </span>
        </div>

        {previewData.warnings.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-yellow-500 mb-2">Warnings</h4>
            <ul className="list-disc list-inside text-sm text-yellow-200/70 space-y-1">
              {previewData.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-8">
          <Button variant="outline" onClick={onClose} disabled={isApplying}>
            CANCEL
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={isApplying || previewData.assignmentsToCreate === 0 && previewData.assignmentsToRemove === 0}>
            {isApplying ? 'APPLYING...' : 'APPLY ASSIGNMENTS'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
