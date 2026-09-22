import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Label } from '../ui/Form';
import { useToast } from '../ui/ToastContext';
import { ParticipantService } from '../../services/ParticipantService';
import { AuditService } from '../../services/AuditService';
import type { Participant } from '../../types/models';

interface QuickEditModalProps {
  open: boolean;
  onClose: () => void;
  participant: Participant | null;
  adminId: string;
}

export default function QuickEditModal({ open, onClose, participant, adminId }: QuickEditModalProps) {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState<Partial<Participant>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (participant) {
      const { name, mobile, college, track, internalNotes } = participant;
      setForm({ name, mobile, college, track, internalNotes });
    }
  }, [participant]);

  const handleChange = (field: keyof Participant, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!participant) return;
    setIsSaving(true);
    try {
      await ParticipantService.updateParticipant(participant.id, form);
      await AuditService.logAction({
        actorId: adminId,
        actorRole: 'super_admin',
        action: 'QUICK_EDIT_PARTICIPANT',
        targetId: participant.id,
        resourceType: 'participant',
        metadata: { updatedFields: Object.keys(form) }
      });
      success('Participant updated', `${participant.name} has been saved.`);
      onClose();
    } catch (err: any) {
      toastError('Update failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Quick Edit Participant" maxWidth="md">
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input value={form.name || ''} onChange={e => handleChange('name', e.target.value)} />
        </div>
        <div>
          <Label>Mobile</Label>
          <Input value={form.mobile || ''} onChange={e => handleChange('mobile', e.target.value)} />
        </div>
        <div>
          <Label>College</Label>
          <Input value={form.college || ''} onChange={e => handleChange('college', e.target.value)} />
        </div>
        <div>
          <Label>Track</Label>
          <Input value={form.track || ''} onChange={e => handleChange('track', e.target.value)} />
        </div>
        <div>
          <Label>Internal Notes</Label>
          <Input value={form.internalNotes || ''} onChange={e => handleChange('internalNotes', e.target.value)} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSave} disabled={isSaving}>Save Changes</Button>
      </div>
    </Modal>
  );
}
