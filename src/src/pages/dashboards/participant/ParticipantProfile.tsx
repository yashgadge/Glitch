import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { ParticipantService } from '../../../services/ParticipantService';
import type { Participant } from '../../../types/models';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Label } from '../../../components/ui/Form';
import { useToast } from '../../../components/ui/ToastContext';
import { Settings, User, Save, Globe, Briefcase, Mail, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ParticipantProfile() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [profile, setProfile] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [githubId, setGithubId] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsub = ParticipantService.subscribeToParticipant(user.uid, (data) => {
      if (data) {
        setProfile(data);
        setName(data.name || '');
        setCollege(data.college || '');
        setGithubId(data.githubId || '');
        setLinkedinUrl(data.linkedinUrl || '');
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    try {
      await ParticipantService.updateParticipant(user.uid, {
        name,
        college,
        githubId,
        linkedinUrl
      });
      success('Profile updated successfully.');
    } catch (err) {
      error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-2">
          <Settings className="w-8 h-8 text-primary" /> PROFILE SETTINGS
        </h1>
        <p className="font-inter text-gray-400">Manage your personal information and developer identity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="bg-black/40 border-white/10 h-full">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/50 flex items-center justify-center mb-4 relative overflow-hidden">
                <User className="w-12 h-12 text-primary" />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 pt-1 pb-2">
                  <span className="font-bebas text-xs text-white tracking-widest">EDIT</span>
                </div>
              </div>
              <h2 className="font-bebas text-2xl text-white tracking-wider mb-1">{profile?.name}</h2>
              <p className="font-mono text-sm text-primary mb-4">{profile?.glitchId || 'ID PENDING'}</p>
              
              <div className="w-full space-y-3 mt-4 text-left border-t border-white/10 pt-4">
                <div className="flex items-center gap-2 text-gray-400 font-inter text-sm">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="truncate">{user?.email}</span>
                </div>
                {profile?.college && (
                  <div className="flex items-center gap-2 text-gray-400 font-inter text-sm">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="truncate">{profile.college}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>PUBLIC INFORMATION</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400 mb-2 block">FULL NAME</Label>
                      <Input 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 mb-2 block">COLLEGE / UNIVERSITY</Label>
                      <Input 
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                        placeholder="Institute Name"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 mt-6">
                    <h4 className="font-bebas tracking-wider text-xl text-white mb-4">DEVELOPER IDENTITY</h4>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-400 mb-2 flex items-center gap-2">
                          <Globe className="w-4 h-4" /> GITHUB USERNAME
                        </Label>
                        <Input 
                          value={githubId}
                          onChange={(e) => setGithubId(e.target.value)}
                          placeholder="johndoe"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400 mb-2 flex items-center gap-2">
                          <Briefcase className="w-4 h-4" /> LINKEDIN URL
                        </Label>
                        <Input 
                          value={linkedinUrl}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                          placeholder="https://linkedin.com/in/..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-2">
                    <Button type="submit" disabled={saving} className="flex items-center gap-2">
                      <Save className="w-4 h-4" /> {saving ? 'SAVING...' : 'SAVE CHANGES'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-red-500/20 bg-red-500/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-bebas text-xl text-red-500 tracking-wider mb-1">ACCOUNT SECURITY</h4>
                    <p className="font-inter text-sm text-gray-400 mb-4">
                      To change your password or email, please contact a system administrator. If you suspect your account is compromised, report it immediately to the Organizer booth.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
