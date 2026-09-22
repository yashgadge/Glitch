import React, { useState, useEffect, FormEvent } from 'react';
import { Settings, Plus, GripVertical, Trash2, Edit2, Lock, Unlock, Eye, EyeOff, Copy, ArrowUp, ArrowDown, CheckSquare, X } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Select, Checkbox, Label } from '../../../components/ui/Form';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/ToastContext';
import { SubmissionConfigService } from '../../../services/SubmissionConfigService';
import { EventConfigService } from '../../../services/EventConfigService';
import type { SubmissionField, SubmissionFieldType, UrlValidationType, EventConfig } from '../../../types/models';

export default function SubmissionSettings() {
  const { success, error } = useToast();
  const [fields, setFields] = useState<SubmissionField[]>([]);
  const [eventConfig, setEventConfig] = useState<EventConfig | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const [editingField, setEditingField] = useState<SubmissionField | null>(null);
  const [fieldType, setFieldType] = useState<SubmissionFieldType>('text');
  const [urlValidation, setUrlValidation] = useState<UrlValidationType>('any');
  const [fieldOptions, setFieldOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    const unsubFields = SubmissionConfigService.subscribeToConfig(setFields);
    const unsubConfig = EventConfigService.subscribeToConfig((config) => {
      setEventConfig(config);
    });

    return () => {
      unsubFields();
      unsubConfig();
    };
  }, []);

  const handleUpdateConfig = async (updates: Partial<EventConfig>) => {
    if (!eventConfig) return;
    try {
      await EventConfigService.updateConfig(updates);
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
    
    // Ensure displayOrder is correctly set to prevent duplicate order indexes
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
      const { id, ...rest } = field;
      await SubmissionConfigService.addField({
        ...rest,
        name: `${rest.name} (Copy)`,
        displayOrder: fields.length
      });
      success('Field duplicated');
    } catch (err) {
      error('Failed to duplicate field');
    }
  };

  const addOption = () => {
    if (newOption.trim()) {
      if (fieldOptions.includes(newOption.trim())) {
        return error('Validation Failed: Option already exists');
      }
      setFieldOptions([...fieldOptions, newOption.trim()]);
      setNewOption('');
    }
  };

  const removeOption = (idx: number) => {
    setFieldOptions(fieldOptions.filter((_, i) => i !== idx));
  };

  const handleSubmitField = async (data: Omit<SubmissionField, 'id' | 'displayOrder'>) => {
    // Validations
    if (!data.name || data.name.trim() === '') {
      return error('Validation Failed: Empty labels are not allowed.');
    }
    
    const isDuplicateLabel = fields.some(f => f.name.toLowerCase() === data.name.toLowerCase() && f.id !== editingField?.id);
    if (isDuplicateLabel) {
      return error('Validation Failed: Duplicate label.');
    }

    if (['text', 'textarea', 'url', 'number'].includes(data.type)) {
      if (!data.placeholder || data.placeholder.trim() === '') {
        return error('Validation Failed: Empty placeholders are not allowed.');
      }
    }

    if (['select', 'multiselect'].includes(data.type)) {
      if (fieldOptions.length === 0) {
        return error('Validation Failed: Invalid select options (must have at least one).');
      }
      data.options = fieldOptions;
    }

    try {
      if (editingField) {
        await SubmissionConfigService.updateField(editingField.id, data);
        success('Field updated');
      } else {
        await SubmissionConfigService.addField({
          ...data,
          displayOrder: fields.length // ensures no duplicate order index at creation
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
    setFieldOptions([]);
    setIsModalOpen(true);
  };

  const openEditModal = (field: SubmissionField) => {
    setEditingField(field);
    setFieldType(field.type);
    setUrlValidation(field.urlValidation || 'any');
    setFieldOptions(field.options || []);
    setIsModalOpen(true);
  };

  // Preview form component simulation
  const renderPreviewField = (field: SubmissionField) => {
    if (!field.enabled) return null;
    return (
      <div key={field.id} className="space-y-1 bg-white/5 p-4 rounded-lg border border-white/10">
        <Label>
          {field.name} {field.required && <span className="text-red-400">*</span>}
        </Label>
        
        {field.type === 'text' && <Input placeholder={field.placeholder} readOnly />}
        {field.type === 'number' && <Input type="number" placeholder={field.placeholder} readOnly />}
        {field.type === 'url' && <Input type="url" placeholder={field.placeholder} readOnly />}
        {field.type === 'textarea' && <textarea className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50 font-inter resize-none" rows={4} placeholder={field.placeholder} readOnly />}
        {field.type === 'checkbox' && (
          <label className="flex items-center gap-3 text-white cursor-pointer mt-2">
            <Checkbox readOnly />
            <span className="font-inter text-sm">{field.description || 'Check to confirm'}</span>
          </label>
        )}
        {field.type === 'select' && (
          <Select readOnly>
            <option value="">{field.placeholder || '-- Select --'}</option>
            {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
          </Select>
        )}
        {field.type === 'multiselect' && (
          <div className="space-y-2 mt-2">
            {field.options?.map(o => (
              <label key={o} className="flex items-center gap-3 text-white cursor-pointer">
                <Checkbox readOnly />
                <span className="font-inter text-sm">{o}</span>
              </label>
            ))}
          </div>
        )}
        
        {field.description && field.type !== 'checkbox' && (
          <p className="text-xs text-gray-500 font-inter mt-1">{field.description}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" /> SUBMISSION ENGINE CONFIGURATION
        </h2>
        <p className="font-inter text-gray-400">Manage dynamic submission fields, deadlines, and global locks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6 border-primary/20 bg-primary/5">
          <h3 className="text-xl font-bebas text-white mb-4">DEADLINE & LOCKING</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300 font-inter">Submissions Open</p>
              </div>
              <Checkbox 
                checked={eventConfig?.isSubmissionOpen || false}
                onChange={(e) => handleUpdateConfig({ isSubmissionOpen: e.target.checked })}
              />
            </div>
            <div className="space-y-1">
              <Label>Submission Deadline</Label>
              <Input 
                type="datetime-local" 
                value={eventConfig?.submissionDeadline ? new Date(eventConfig.submissionDeadline).toISOString().slice(0,16) : ''}
                onChange={(e) => handleUpdateConfig({ submissionDeadline: new Date(e.target.value).toISOString() })}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-300 font-inter">Auto-Lock After Deadline</p>
              <Checkbox 
                checked={eventConfig?.autoLockAfterDeadline || false}
                onChange={(e) => handleUpdateConfig({ autoLockAfterDeadline: e.target.checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-300 font-inter">Allow Late Submission</p>
              <Checkbox 
                checked={eventConfig?.allowLateSubmission || false}
                onChange={(e) => handleUpdateConfig({ allowLateSubmission: e.target.checked })}
              />
            </div>
          </div>
        </Card>
        
        <Card className="p-6 border-white/10">
          <h3 className="text-xl font-bebas text-white mb-4">EDITING RULES</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300 font-inter">Allow Submission Editing</p>
                <p className="text-xs text-gray-500 font-inter">Globally enable or disable all editing.</p>
              </div>
              <Checkbox 
                checked={eventConfig?.allowSubmissionEditing || false}
                onChange={(e) => handleUpdateConfig({ allowSubmissionEditing: e.target.checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300 font-inter">Allow Editing After Submission</p>
                <p className="text-xs text-gray-500 font-inter">If disabled, finalizing submission locks it.</p>
              </div>
              <Checkbox 
                checked={eventConfig?.allowEditingAfterSubmission || false}
                onChange={(e) => handleUpdateConfig({ allowEditingAfterSubmission: e.target.checked })}
              />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bebas text-white">DYNAMIC FIELDS</h3>
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
                    {field.type === 'url' && field.urlValidation !== 'any' && (
                       <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded uppercase font-mono">{field.urlValidation}</span>
                    )}
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
              <p className="text-gray-500 font-inter">No submission fields have been configured yet.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Add / Edit Field Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingField ? 'EDIT FIELD' : 'NEW FIELD'} size="2xl">
        <form onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSubmitField({
            name: formData.get('name') as string,
            type: formData.get('type') as SubmissionFieldType,
            placeholder: formData.get('placeholder') as string,
            description: formData.get('description') as string,
            urlValidation: (formData.get('urlValidation') as UrlValidationType) || undefined,
            customDomain: formData.get('customDomain') as string || undefined,
            maxLength: formData.get('maxLength') ? parseInt(formData.get('maxLength') as string) : undefined,
            required: formData.get('required') === 'on',
            enabled: formData.get('enabled') === 'on',
          });
        }}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            <div>
              <Label>Field Name <span className="text-red-400">*</span></Label>
              <Input name="name" defaultValue={editingField?.name || ''} placeholder="e.g. GitHub Repository" required />
            </div>
            
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
                <option value="checkbox">Checkbox</option>
                <option value="select">Select (Dropdown)</option>
                <option value="multiselect">Multi Select</option>
              </Select>
            </div>

            {fieldType === 'url' && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-4">
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
                    <option value="gdrive">Google Drive</option>
                    <option value="figma">Figma</option>
                    <option value="devpost">Devpost</option>
                    <option value="custom">Custom Domain</option>
                  </Select>
                </div>
                {urlValidation === 'custom' && (
                  <div>
                    <Label>Allowed Domain</Label>
                    <Input name="customDomain" defaultValue={editingField?.customDomain || ''} placeholder="e.g. example.com" />
                  </div>
                )}
              </div>
            )}

            {(fieldType === 'select' || fieldType === 'multiselect') && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-4">
                <Label>Options <span className="text-red-400">*</span></Label>
                <div className="space-y-2">
                  {fieldOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-black/40 rounded border border-white/5">
                      <span className="text-white text-sm font-inter">{opt}</span>
                      <button type="button" onClick={() => removeOption(idx)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {fieldOptions.length === 0 && (
                    <div className="text-sm text-gray-500 italic">No options added yet.</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input value={newOption} onChange={e => setNewOption(e.target.value)} placeholder="Add a new option..." />
                  <Button type="button" variant="outline" onClick={addOption}>Add</Button>
                </div>
              </div>
            )}

            {(fieldType === 'text' || fieldType === 'textarea') && (
              <div>
                <Label>Maximum Length (Characters)</Label>
                <Input name="maxLength" type="number" defaultValue={editingField?.maxLength || ''} placeholder="e.g. 500" />
              </div>
            )}

            {fieldType !== 'checkbox' && (
              <div>
                <Label>Placeholder Text <span className="text-red-400">*</span></Label>
                <Input name="placeholder" defaultValue={editingField?.placeholder || ''} placeholder="e.g. Enter value..." />
              </div>
            )}

            <div>
              <Label>Help Text</Label>
              <Input name="description" defaultValue={editingField?.description || ''} placeholder="e.g. Provide the link to your public repository" />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            <Button type="submit" variant="primary">SAVE FIELD</Button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="PARTICIPANT FORM PREVIEW" size="2xl">
        <div className="space-y-6">
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl mb-4">
            <p className="text-sm text-primary font-inter">This is exactly how participants will see the form during submission.</p>
          </div>
          
          <form className="space-y-6" onSubmit={e => e.preventDefault()}>
            {fields.filter(f => f.enabled).length === 0 ? (
              <div className="text-center py-8 text-gray-500 font-inter">No submission fields have been configured yet.</div>
            ) : (
              fields.filter(f => f.enabled).sort((a,b) => a.displayOrder - b.displayOrder).map(renderPreviewField)
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
