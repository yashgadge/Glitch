import React, { useState, useEffect, FormEvent } from 'react';
import { Settings, Plus, Trash2, Edit2, Eye, EyeOff, Copy, ArrowUp, ArrowDown, Settings2, Save } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Select, Checkbox, Label } from '../../../components/ui/Form';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/ToastContext';
import { SubmissionConfigService } from '@shared/services/SubmissionConfigService';
import { RoundService } from '@shared/services/RoundService';
import type { SubmissionField, SubmissionFieldType, UrlValidationType, Round, RoundSubmissionConfig } from '@shared/types/models';

export default function SubmissionSettings() {
  const { success, error } = useToast();
  
  const [rounds, setRounds] = useState<Round[]>([]);
  const [activeRoundId, setActiveRoundId] = useState<number>(0);
  
  const [roundConfig, setRoundConfig] = useState<RoundSubmissionConfig | null>(null);
  const [fields, setFields] = useState<SubmissionField[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  const [editingField, setEditingField] = useState<SubmissionField | null>(null);
  const [fieldType, setFieldType] = useState<SubmissionFieldType>('text');
  const [urlValidation, setUrlValidation] = useState<UrlValidationType>('any');

  useEffect(() => {
    const fetchRounds = async () => {
      const allRounds = await RoundService.getAllRounds();
      const sortedRounds = allRounds.sort((a, b) => a.order - b.order);
      setRounds(sortedRounds);
      
      if (sortedRounds.length > 0) {
        // Automatically select the round that is active or the first one
        const active = sortedRounds.find(r => r.status === 'SUBMISSION_OPEN' || r.status === 'SCHEDULED' || r.status === 'EVALUATION_OPEN');
        setActiveRoundId(active ? Number(active.id) : Number(sortedRounds[0].id));
      }
    };
    fetchRounds();
  }, []);

  useEffect(() => {
    if (!activeRoundId) return;
    
    const unsubConfig = SubmissionConfigService.subscribeToRoundConfig(activeRoundId, (config) => {
      if (config) {
        setRoundConfig(config);
      } else {
        // ensure default config exists
        SubmissionConfigService.updateRoundConfig(activeRoundId, {});
      }
    });

    const unsubFields = SubmissionConfigService.subscribeToFields(activeRoundId, setFields);

    return () => {
      unsubConfig();
      unsubFields();
    };
  }, [activeRoundId]);

  const handleUpdateConfig = async (updates: Partial<RoundSubmissionConfig>) => {
    if (!activeRoundId) return;
    try {
      await SubmissionConfigService.updateRoundConfig(activeRoundId, updates);
      success('Settings updated');
    } catch (err) {
      error('Failed to update settings');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this field?')) return;
    try {
      await SubmissionConfigService.deleteField(id);
      success('Field deleted');
    } catch (err) {
      error('Failed to delete field');
    }
  };

  const handleToggleEnable = async (field: SubmissionField) => {
    try {
      await SubmissionConfigService.updateField(field.id, { enabled: !field.enabled });
      success(`Field ${field.enabled ? 'Disabled' : 'Enabled'}`);
    } catch (err) {
      error('Failed to update field status');
    }
  };
  
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;
    
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;
    
    newFields.forEach((f, i) => f.displayOrder = i);
    
    try {
      await SubmissionConfigService.reorderFields(newFields.map(f => f.id));
      success('Order updated');
    } catch (err) {
      error('Failed to reorder fields');
    }
  };

  const handleDuplicate = async (field: SubmissionField) => {
    try {
      const { id, roundId, ...rest } = field as any;
      await SubmissionConfigService.addField(activeRoundId, {
        ...rest,
        name: `${rest.name} (Copy)`,
        displayOrder: fields.length
      });
      success('Field duplicated');
    } catch (err) {
      error('Failed to duplicate field');
    }
  };

  const handleSubmitField = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {
      name: formData.get('name') as string,
      type: formData.get('type') as SubmissionFieldType,
      placeholder: formData.get('placeholder') as string,
      description: formData.get('description') as string,
      required: formData.get('required') === 'on',
      enabled: formData.get('enabled') === 'on',
    };

    const uv = formData.get('urlValidation');
    if (uv) {
      data.urlValidation = uv as UrlValidationType;
    } else {
      data.urlValidation = 'any';
    }

    if (!data.name || data.name.trim() === '') {
      return error('Empty labels are not allowed.');
    }

    try {
      if (editingField) {
        await SubmissionConfigService.updateField(editingField.id, data);
        success('Field updated');
      } else {
        await SubmissionConfigService.addField(activeRoundId, {
          ...data,
          displayOrder: fields.length
        });
        success('Field added');
      }
      setIsModalOpen(false);
    } catch (err) {
      error('Failed to save field');
    }
  };

  const openNewModal = () => {
    setEditingField(null);
    setFieldType('text');
    setUrlValidation('any');
    setIsModalOpen(true);
  };

  const openEditModal = (field: SubmissionField) => {
    setEditingField(field);
    setFieldType(field.type);
    setUrlValidation(field.urlValidation || 'any');
    setIsModalOpen(true);
  };

  const currentRoundObj = rounds.find(r => Number(r.id) === activeRoundId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" /> SUBMISSION ENGINE CONFIGURATION
          </h2>
          <p className="font-inter text-gray-400">Configure round-specific submission rules and dynamic fields.</p>
        </div>
      </div>

      <Card className="p-4 flex items-center gap-4 bg-primary/10 border-primary/20">
        <Label className="text-primary m-0 whitespace-nowrap">CONFIGURE FOR ROUND:</Label>
        <Select 
          value={activeRoundId} 
          onChange={(e) => setActiveRoundId(Number(e.target.value))}
          className="w-[300px]"
        >
          {rounds.map(r => (
            <option key={r.id} value={r.id}>{r.name} — {r.displayName}</option>
          ))}
        </Select>
      </Card>

      {!activeRoundId ? (
        <div className="text-center py-12 text-gray-500 font-inter border border-dashed border-white/10 rounded-xl">
          Please select a round to configure submissions.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="p-6 border-white/10">
              <h3 className="text-xl font-bebas text-white mb-4">STATUS</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-300 font-inter">Current Status</p>
                  <span className={`px-2 py-1 rounded text-xs font-mono uppercase ${
                    currentRoundObj?.status === 'SUBMISSION_OPEN' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {currentRoundObj?.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-300 font-inter">Deadline</p>
                  <span className="text-sm font-mono text-primary">
                    {currentRoundObj?.submissionCloseAt ? new Date(currentRoundObj.submissionCloseAt).toLocaleString() : 'Not Set'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">
                  Note: Deadlines and status are driven by the Round Management schedule.
                </p>
              </div>
            </Card>

            <Card className="p-6 border-white/10">
              <h3 className="text-xl font-bebas text-white mb-4">SUBMISSION RULES</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300 font-inter">Submitter Role</p>
                  </div>
                  <Select 
                    className="w-[180px]"
                    value={roundConfig?.submitterRole || 'team_leader'}
                    onChange={(e) => handleUpdateConfig({ submitterRole: e.target.value as any })}
                  >
                    <option value="team_leader">Team Leader</option>
                    <option value="any">Any Member</option>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300 font-inter">Max Revisions</p>
                  </div>
                  <Input 
                    type="number" 
                    className="w-[180px]" 
                    value={roundConfig?.maxRevisions || 1}
                    min="1"
                    onChange={(e) => handleUpdateConfig({ maxRevisions: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsAdvancedOpen(true)}>
                    <Settings2 className="w-4 h-4 mr-2" /> ADVANCED SETTINGS
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bebas text-white">SUBMISSION FIELDS</h3>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
                  <Eye className="w-4 h-4 mr-2" /> PREVIEW
                </Button>
                <Button variant="primary" onClick={openNewModal}>
                  <Plus className="w-4 h-4 mr-2" /> ADD FIELD
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className={`flex items-center justify-between p-4 rounded-xl border ${field.enabled ? 'bg-white/5 border-white/10' : 'bg-black/40 border-white/5 opacity-60'}`}>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="text-gray-500 hover:text-white disabled:opacity-30">
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleMove(index, 'down')} disabled={index === fields.length - 1} className="text-gray-500 hover:text-white disabled:opacity-30">
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-inter text-white font-medium">{field.name}</span>
                        {field.required && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded uppercase font-mono">Required</span>}
                        <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded uppercase font-mono">{field.type}</span>
                      </div>
                      <p className="text-sm text-gray-500 font-inter mt-1">{field.description || 'No description'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleToggleEnable(field)} className={field.enabled ? 'text-green-400' : 'text-gray-400'}>
                      {field.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDuplicate(field)} className="text-gray-400">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(field)} className="text-blue-400">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(field.id)} className="text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {fields.length === 0 && (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                  <p className="text-gray-500 font-inter">No custom fields added. Only Presentation PDF will be requested (if enabled).</p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Advanced Settings Modal */}
      <Modal isOpen={isAdvancedOpen} onClose={() => setIsAdvancedOpen(false)} title="ADVANCED ROUND RULES" size="xl">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded border border-white/10">
               <Label>Auto-Lock After Deadline</Label>
               <Checkbox 
                 className="mt-2 block"
                 checked={roundConfig?.autoLockAfterDeadline || false}
                 onChange={(e) => handleUpdateConfig({ autoLockAfterDeadline: e.target.checked })}
               />
            </div>
            <div className="p-4 bg-white/5 rounded border border-white/10">
               <Label>Allow Late Submission</Label>
               <Checkbox 
                 className="mt-2 block"
                 checked={roundConfig?.allowLateSubmission || false}
                 onChange={(e) => handleUpdateConfig({ allowLateSubmission: e.target.checked })}
               />
            </div>
            <div className="p-4 bg-white/5 rounded border border-white/10">
               <Label>Require Presentation PDF</Label>
               <Checkbox 
                 className="mt-2 block"
                 checked={roundConfig?.presentationRequired || false}
                 onChange={(e) => handleUpdateConfig({ presentationRequired: e.target.checked })}
               />
            </div>
            <div className="p-4 bg-white/5 rounded border border-white/10">
               <Label>Allow Draft Editing</Label>
               <Checkbox 
                 className="mt-2 block"
                 checked={roundConfig?.allowDraftEditing || false}
                 onChange={(e) => handleUpdateConfig({ allowDraftEditing: e.target.checked })}
               />
            </div>
          </div>
          <div className="flex justify-end border-t border-white/10 pt-4">
            <Button variant="primary" onClick={() => setIsAdvancedOpen(false)}>DONE</Button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Field Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingField ? 'EDIT FIELD' : 'NEW FIELD'} size="xl">
        <form onSubmit={handleSubmitField}>
          <div className="space-y-4 px-1">
            <div>
              <Label>Field Name <span className="text-red-400">*</span></Label>
              <Input name="name" defaultValue={editingField?.name || ''} placeholder="e.g. GitHub Repository" required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Field Type <span className="text-red-400">*</span></Label>
                <Select 
                  name="type" 
                  value={fieldType} 
                  onChange={(e) => setFieldType(e.target.value as SubmissionFieldType)} 
                  required
                >
                  <option value="text">Short Text</option>
                  <option value="textarea">Long Text</option>
                  <option value="url">URL Link</option>
                  <option value="number">Number</option>
                </Select>
              </div>
              
              {fieldType === 'url' && (
                <div>
                  <Label>URL Validation</Label>
                  <Select 
                    name="urlValidation" 
                    value={urlValidation} 
                    onChange={(e) => setUrlValidation(e.target.value as UrlValidationType)}
                  >
                    <option value="any">Any URL</option>
                    <option value="github">GitHub</option>
                    <option value="youtube">YouTube</option>
                    <option value="figma">Figma</option>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label>Placeholder Text <span className="text-red-400">*</span></Label>
              <Input name="placeholder" defaultValue={editingField?.placeholder || ''} placeholder="e.g. Enter value..." required />
            </div>

            <div>
              <Label>Help Text Description</Label>
              <Input name="description" defaultValue={editingField?.description || ''} placeholder="e.g. Provide the link to your public repository" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <label className="flex items-center gap-2 text-white font-inter text-sm cursor-pointer">
                <Checkbox name="required" defaultChecked={editingField?.required || false} />
                Required Field
              </label>
              
              <label className="flex items-center gap-2 text-white font-inter text-sm cursor-pointer">
                <Checkbox name="enabled" defaultChecked={editingField ? editingField.enabled : true} />
                Enabled (Visible)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>CANCEL</Button>
            <Button type="submit" variant="primary"><Save className="w-4 h-4 mr-2"/> SAVE FIELD</Button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="PARTICIPANT FORM PREVIEW" size="2xl">
        <div className="space-y-6">
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl mb-4">
            <p className="text-sm text-primary font-inter">This is how participants will see the form during submission for <strong>{currentRoundObj?.name}</strong>.</p>
          </div>
          
          <form className="space-y-6" onSubmit={e => e.preventDefault()}>
            {fields.filter(f => f.enabled).map(field => (
              <div key={field.id} className="space-y-1 bg-white/5 p-4 rounded-lg border border-white/10">
                <Label>
                  {field.name} {field.required && <span className="text-red-400">*</span>}
                </Label>
                {field.type === 'textarea' ? (
                  <textarea className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50 font-inter resize-none" rows={4} placeholder={field.placeholder} readOnly />
                ) : (
                  <Input type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'} placeholder={field.placeholder} readOnly />
                )}
                {field.description && (
                  <p className="text-xs text-gray-500 font-inter mt-1">{field.description}</p>
                )}
              </div>
            ))}
            
            {roundConfig?.presentationRequired && (
              <div className="space-y-1 bg-white/5 p-4 rounded-lg border border-white/10 border-l-4 border-l-red-500">
                <Label className="text-red-400 flex items-center gap-2">
                   Presentation PDF <span className="text-red-400">*</span>
                </Label>
                <div className="h-24 border-2 border-dashed border-white/20 rounded flex items-center justify-center text-gray-500 font-inter text-sm">
                   PDF Upload Component
                </div>
              </div>
            )}
            
            {fields.filter(f => f.enabled).length === 0 && !roundConfig?.presentationRequired && (
              <div className="text-center py-8 text-gray-500 font-inter">No fields configured.</div>
            )}
          </form>

          <div className="flex justify-end pt-6 border-t border-white/10">
            <Button variant="ghost" onClick={() => setIsPreviewOpen(false)}>Close Preview</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
