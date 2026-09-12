import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { User, Mail, Phone, MapPin, Clock, Key } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { ParticipantService } from '@shared/services/ParticipantService';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input, Label } from '../../../components/ui/Form';
import { useToast } from '../../../components/ui/ToastContext';
import type { Staff, AuditLog } from '@shared/types/models';
import { AuditService } from '@shared/services/AuditService';
import { motion, AnimatePresence } from 'framer-motion';

export default function VolunteerProfile() {
  const { user, updatePassword } = useAuth();
  const { success, error } = useToast();
  const [profile, setProfile] = useState<Staff | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'activity'>('profile');
  
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    let unsubLogs: () => void;
    
    const fetchProfile = async () => {
      const data = await ParticipantService.getStaffProfile(user.uid);
      setProfile(data);
      
      unsubLogs = AuditService.getLogsForActor(user.uid, (data) => {
        setLogs(data);
      });
    };
    fetchProfile();
    
    return () => {
      if (unsubLogs) unsubLogs();
    };
  }, [user]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      error('New passwords do not match');
      return;
    }
    if (passwordForm.new.length < 6) {
      error('Password must be at least 6 characters');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      await updatePassword(passwordForm.new);
      success('Password updated successfully');
      setIsPasswordModalOpen(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      error(err.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
          <User className="w-8 h-8 text-primary" /> VOLUNTEER PROFILE
        </h2>
        <p className="font-inter text-gray-400">Manage your field operative details and activity.</p>
      </div>
      
      <div className="flex gap-4 border-b border-white/10 pb-2">
        <button 
          className={`font-bebas tracking-wider text-xl px-4 py-2 transition-colors ${activeTab === 'profile' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-white'}`}
          onClick={() => setActiveTab('profile')}
        >
          PROFILE
        </button>
        <button 
          className={`font-bebas tracking-wider text-xl px-4 py-2 transition-colors ${activeTab === 'activity' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-white'}`}
          onClick={() => setActiveTab('activity')}
        >
          MY ACTIVITY
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' ? (
          <motion.div 
            key="profile"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="md:col-span-1">
              <Card className="p-6 flex flex-col items-center text-center h-full">
            <div className="w-32 h-32 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mb-4">
              <User className="w-16 h-16 text-primary" />
            </div>
            <h3 className="font-bebas text-2xl text-white tracking-wide">{profile.name}</h3>
            <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-mono text-gray-300 mt-2 uppercase tracking-wider">
              {profile.role}
            </span>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="font-bebas text-xl text-white mb-6 border-b border-white/10 pb-2">OPERATIONAL ASSIGNMENT</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-black/30 p-4 rounded-lg border border-white/5">
                <MapPin className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-primary font-inter">Assigned Zone</p>
                  <p className="text-white font-bebas text-xl tracking-wider">{profile.metadata?.zone || 'Unassigned'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-black/30 p-4 rounded-lg border border-white/5">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 font-inter">Assigned Shift</p>
                  <p className="text-white font-inter text-sm mt-1">{profile.metadata?.shift || 'All Day'}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bebas text-xl text-white mb-6 border-b border-white/10 pb-2">CONTACT DETAILS</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-black/30 p-4 rounded-lg border border-white/5">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 font-inter">Email Address</p>
                  <p className="text-white font-inter">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-black/30 p-4 rounded-lg border border-white/5">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 font-inter">Phone Number</p>
                  <p className="text-white font-inter">{profile.metadata?.phone || 'Not Provided'}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bebas text-xl text-white mb-4 border-b border-white/10 pb-2">SECURITY</h3>
            <p className="text-sm text-gray-400 font-inter mb-4">
              Update your password to keep your account secure.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setIsPasswordModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Key className="w-4 h-4" /> CHANGE PASSWORD
            </Button>
            </Card>
          </div>
        </motion.div>
        ) : (
          <motion.div 
            key="activity"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-6">
              <h3 className="font-bebas text-2xl text-white mb-6 border-b border-white/10 pb-2">ACTIVITY LOG</h3>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {logs.length === 0 ? (
                  <p className="text-gray-500 font-inter text-sm italic">No recent activity found.</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-4 p-4 rounded-lg bg-black/20 border border-white/5">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-white font-mono text-sm break-all">{log.action}</p>
                        <p className="text-xs text-gray-400 font-inter mt-1">Target ID: {log.targetId}</p>
                        <span className="text-[10px] text-gray-500 font-mono block mt-2">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="CHANGE PASSWORD">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <Label>New Password</Label>
            <Input 
              type="password" 
              required
              value={passwordForm.new}
              onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
            />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input 
              type="password" 
              required
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsPasswordModalOpen(false)}>CANCEL</Button>
            <Button type="submit" variant="primary" disabled={isChangingPassword}>
              {isChangingPassword ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
