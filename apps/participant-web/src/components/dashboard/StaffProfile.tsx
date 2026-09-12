import React, { useState, useEffect } from 'react';
import { useAuth } from '@shared/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Lock, User, Phone, ShieldCheck } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db } from '@shared/lib/firebase';
import { logAuditAction } from '@shared/lib/auditLogger';

export default function StaffProfile() {
  const { user, role } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const docRef = await getDoc(doc(db, 'staff', user.uid));
      if (docRef.exists()) {
        const data = docRef.data();
        setName(data.name || '');
        setPhone(data.phone || '');
      }
    };
    fetchProfile();
  }, [user]);

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setMessage(null);
    try {
      await updateDoc(doc(db, 'staff', user.uid), {
        name,
        phone
      });
      setMessage({ type: 'success', text: 'Profile details updated successfully.' });
      await logAuditAction('PROFILE_UPDATED', `Staff ${user.email} updated details`);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update details.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Re-authenticate user before updating password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully.' });
      await logAuditAction('PASSWORD_CHANGED', `Staff ${user.email} changed password`);
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setMessage({ type: 'error', text: 'Incorrect current password.' });
      } else {
        setMessage({ type: 'error', text: err.message || 'Failed to change password.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8 p-6 bg-white/5 border border-white/10 rounded-xl">
        <ShieldCheck className="w-12 h-12 text-primary" />
        <div>
          <h1 className="font-bebas text-3xl tracking-widest text-white">STAFF PROFILE</h1>
          <p className="font-inter text-gray-400">
            Manage your personal details and security credentials.
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg font-inter text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              PERSONAL DETAILS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateDetails} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-inter mb-2">FULL NAME</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 transition-all font-inter"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 font-inter mb-2">PHONE NUMBER</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 transition-all font-inter"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-inter mb-2">EMAIL (READ ONLY)</label>
                <div className="relative">
                  <input 
                    type="email" 
                    disabled
                    value={user?.email || ''}
                    className="w-full bg-black/50 border border-white/5 rounded-lg py-2.5 px-4 text-gray-500 font-inter cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-inter mb-2">ASSIGNED ROLE (READ ONLY)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    disabled
                    value={role?.toUpperCase() || ''}
                    className="w-full bg-black/50 border border-white/5 rounded-lg py-2.5 px-4 text-primary font-mono text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" disabled={loading} className="w-full">
                  UPDATE DETAILS
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              CHANGE PASSWORD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-inter mb-2">CURRENT PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="password" 
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 transition-all font-inter"
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <label className="block text-xs text-gray-400 font-inter mb-2">NEW PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="password" 
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 transition-all font-inter"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-inter mb-2">CONFIRM NEW PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 transition-all font-inter"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="outline" disabled={loading} className="w-full">
                  UPDATE PASSWORD
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

