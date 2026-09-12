import React, { useState, useEffect } from 'react';
import { useAuth } from '@shared/contexts/AuthContext';
import { ParticipantService } from '@shared/services/ParticipantService';
import type { Participant } from '@shared/types/models';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Label } from '../../../components/ui/Form';
import { useToast } from '../../../components/ui/ToastContext';
import { Settings, User, Save, Globe, Briefcase, Mail, ShieldAlert, Key } from 'lucide-react';
import { motion } from 'framer-motion';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@shared/lib/firebase';
import { Badge } from '../../../components/ui/Badge';

export default function ParticipantProfile() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [profile, setProfile] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [city, setCity] = useState('');
  const [githubId, setGithubId] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsub = ParticipantService.subscribeToParticipant(user.uid, (data) => {
      if (data) {
        setProfile(data);
        setName(data.name || '');
        setPhone(data.phone || '');
        setCollege(data.college || '');
        setCity(data.city || '');
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
        phone,
        mobile: phone,
        college,
        city,
        githubId,
        linkedinUrl
      });
      success('Profile updated successfully.');
    } catch (err) {
      showError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }
    setResettingPassword(true);
    try {
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      success('Password Updated!', 'Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      showError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setResettingPassword(false);
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
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-2">
          <Settings className="w-8 h-8 text-primary" /> PROFILE SETTINGS
        </h1>
        <p className="font-inter text-gray-400">Manage your personal information and developer identity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div className="p-6 bg-black/40 border border-white/10 rounded-xl flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-bebas text-2xl text-white tracking-widest">{profile?.name}</h3>
                <p className="font-inter text-gray-400 text-sm">{profile?.email}</p>
                {profile?.glitchId && (
                  <Badge variant="outline" className="mt-2 border-primary/30 text-primary bg-primary/5">
                    {profile.glitchId}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3">
              <User className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bebas tracking-widest text-yellow-500 text-lg mb-1">TEAM STATUS</h4>
                {profile?.teamId ? (
                  <p className="text-yellow-200/80 font-inter text-sm">Assigned to team <strong>{profile.teamId}</strong></p>
                ) : (
                  <p className="text-yellow-200/80 font-inter text-sm">No team assigned. Join or create a team from the dashboard.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-white/10 bg-black/40">
              <CardContent className="p-6">
                <form onSubmit={handleUpdateProfile}>
                  <h4 className="font-bebas tracking-wider text-xl text-white mb-6 border-b border-white/10 pb-4">PERSONAL INFORMATION</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-400 mb-2 block">FULL NAME</Label>
                      <Input 
                        required 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 mb-2 block">EMAIL ADDRESS</Label>
                      <Input 
                        value={user?.email || ''} 
                        disabled 
                        className="bg-white/5 text-gray-500 cursor-not-allowed"
                        title="Email cannot be changed"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 mb-2 flex items-center gap-2">
                        PHONE NUMBER <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        required 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        placeholder="+91 9876543210"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 mb-2 block">CITY</Label>
                      <Input 
                        required 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)} 
                        placeholder="Mumbai"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-gray-400 mb-2 block">COLLEGE / UNIVERSITY</Label>
                      <Input 
                        required 
                        value={college} 
                        onChange={(e) => setCollege(e.target.value)} 
                        placeholder="Institute of Technology"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10 mt-6">
                    <h4 className="font-bebas tracking-wider text-xl text-white mb-4">DEVELOPER IDENTITY</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div className="pt-6">
                    <Button type="submit" isLoading={saving} className="flex items-center gap-2 w-full md:w-auto">
                      <Save className="w-4 h-4" /> SAVE CHANGES
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-red-500/20 bg-red-500/5">
              <CardContent className="p-6">
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <h4 className="font-bebas text-xl text-red-500 tracking-wider mb-1">CHANGE PASSWORD</h4>
                      <p className="font-inter text-sm text-gray-400 max-w-md">
                        Update your password directly. You will need to provide your current password to confirm your identity.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-14">
                    <div>
                      <Label className="text-red-400/80 mb-2 block text-xs">CURRENT PASSWORD</Label>
                      <Input 
                        type="password"
                        required 
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="bg-black/40 border-red-500/30 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <Label className="text-red-400/80 mb-2 block text-xs">NEW PASSWORD</Label>
                      <Input 
                        type="password"
                        required 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="bg-black/40 border-red-500/30 focus:border-red-500"
                      />
                    </div>
                  </div>
                  
                  <div className="pl-14 pt-2">
                    <Button 
                      type="submit"
                      isLoading={resettingPassword}
                      className="bg-red-500 hover:bg-red-600 text-white border-none w-full md:w-auto"
                    >
                      <Key className="w-4 h-4 mr-2" /> UPDATE PASSWORD
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
