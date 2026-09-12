import React, { useState, useEffect } from 'react';
import { ShieldAlert, Save, Search, User } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastContext';
import { collection, query, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { Staff } from '../../../types/models';
import { useAuth } from '../../../contexts/AuthContext';
import { AuditService } from '../../../services/AuditService';

const AVAILABLE_PERMISSIONS = [
  { id: 'participants.view', label: 'View Participants', category: 'Participants' },
  { id: 'participants.edit', label: 'Edit Participants', category: 'Participants' },
  { id: 'teams.manage', label: 'Manage Teams', category: 'Teams' },
  { id: 'evaluation.unlock', label: 'Unlock Evaluations', category: 'Evaluation' },
  { id: 'results.publish', label: 'Publish Results', category: 'Results' },
  { id: 'qr.generate', label: 'Generate QR Passes', category: 'Digital Pass' },
  { id: 'cms.edit', label: 'Edit Website CMS', category: 'CMS' },
  { id: 'certificates.issue', label: 'Issue Certificates', category: 'Certificates' },
  { id: 'communication.send', label: 'Send Communications', category: 'Communication' },
];

export default function Permissions() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [localPermissions, setLocalPermissions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'staff'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Staff));
      setStaffList(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      setLocalPermissions(selectedStaff.customPermissions || []);
    } else {
      setLocalPermissions([]);
    }
  }, [selectedStaff]);

  const handleToggle = (permId: string) => {
    setLocalPermissions(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleSave = async () => {
    if (!selectedStaff || !user) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'staff', selectedStaff.id);
      await updateDoc(docRef, { customPermissions: localPermissions, updatedAt: new Date().toISOString() });
      
      await AuditService.logAction({
        actorId: user.uid,
        actorRole: user.role,
        action: 'UPDATE_PERMISSIONS',
        targetId: selectedStaff.id,
        resourceType: 'staff',
        metadata: { newPermissions: localPermissions }
      });

      success('Permissions updated successfully');
    } catch (err: any) {
      toastError('Failed to update permissions', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStaff = staffList.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase()));

  // Group permissions
  const categories = Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.category)));

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div>
        <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-primary" /> PERMISSION MATRIX
        </h2>
        <p className="font-inter text-gray-400">Manage granular access controls for staff members.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Staff Selector */}
        <Card className="lg:col-span-1 flex flex-col h-full max-h-[calc(100vh-200px)]">
          <div className="p-4 border-b border-white/10 shrink-0 bg-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50 font-inter"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredStaff.map(staff => (
              <button
                key={staff.id}
                onClick={() => setSelectedStaff(staff)}
                className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between group ${
                  selectedStaff?.id === staff.id ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-white font-inter">{staff.name}</div>
                  <div className="text-xs text-gray-400 font-inter truncate w-48">{staff.email}</div>
                </div>
                <div className="text-[10px] uppercase font-mono tracking-wider text-primary px-2 py-1 bg-primary/10 rounded border border-primary/20">
                  {staff.role}
                </div>
              </button>
            ))}
            {filteredStaff.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm font-inter">No staff found.</div>
            )}
          </div>
        </Card>

        {/* Matrix Editor */}
        <Card className="lg:col-span-2 flex flex-col h-full max-h-[calc(100vh-200px)]">
          {!selectedStaff ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
              <User className="w-12 h-12 mb-4 opacity-50" />
              <p className="font-inter">Select a staff member from the list to manage their permissions.</p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-white/10 shrink-0 flex items-center justify-between bg-white/5">
                <div>
                  <h3 className="text-lg font-medium text-white font-inter">{selectedStaff.name}</h3>
                  <p className="text-sm text-gray-400 font-inter">{selectedStaff.email} • <span className="uppercase text-primary">{selectedStaff.role}</span></p>
                </div>
                <Button variant="primary" leftIcon={Save} onClick={handleSave} isLoading={isSaving}>
                  Save Permissions
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {selectedStaff.role === 'super_admin' ? (
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary font-inter">
                    Super Admins implicitly have all permissions. Modifying custom permissions has no effect on their access level.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {categories.map(category => (
                      <div key={category} className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-white/10 pb-2">{category}</h4>
                        <div className="space-y-2">
                          {AVAILABLE_PERMISSIONS.filter(p => p.category === category).map(perm => {
                            const isGranted = localPermissions.includes(perm.id);
                            return (
                              <label key={perm.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                <span className="text-sm text-gray-300 font-inter">{perm.label}</span>
                                <div className="relative inline-block w-10 h-5 rounded-full transition-colors">
                                  <input 
                                    type="checkbox" 
                                    checked={isGranted}
                                    onChange={() => handleToggle(perm.id)}
                                    className="peer sr-only" 
                                  />
                                  <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </Card>

      </div>
    </div>
  );
}
