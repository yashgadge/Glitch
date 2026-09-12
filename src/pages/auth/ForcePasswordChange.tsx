import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from 'firebase/auth';
import { ParticipantService } from '../../services/ParticipantService';
import { useAuth } from '../../contexts/AuthContext';
import { logAuditAction } from '../../lib/auditLogger';

export default function ForcePasswordChange() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, refreshProfileStatus } = useAuth();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }
    
    if (password.length < 8) {
      return setError('Password must be at least 8 characters long.');
    }

    if (!user) {
      return setError('Session expired. Please log in again.');
    }

    setError('');
    setLoading(true);

    try {
      // 1. Update Password in Firebase Auth
      await updatePassword(user, password);

      // Generate Digital Pass Hash
      const randomHash = Math.random().toString(36).substring(2, 10).toUpperCase();
      const qrData = `${user.uid}-${randomHash}`;

      // 2. Update Firestore document to clear mustChangePassword, activate the account, and provision the Digital Pass
      await ParticipantService.updateParticipant(user.uid, {
        mustChangePassword: false,
        tempPass: '' as any, // Cannot use deleteField() directly through service layer easily without typing, empty string is fine
        status: 'Active',
        activatedAt: new Date().toISOString(),
        passActivated: true,
        qrData: qrData
      } as any);

      // 3. Log Audit Action
      await logAuditAction('PARTICIPANT_ACTIVATED', `Participant ${user.email} changed temp password and activated account.`);

      // 4. Refresh Auth Context
      await refreshProfileStatus();

      // 5. Redirect to Dashboard
      navigate('/dashboard');

    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setError('Security requirement: Please log out and log back in to change your password.');
      } else {
        setError(err.message || 'Failed to update password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 selection:bg-primary/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-[#0a0a0a] to-[#0a0a0a] opacity-60"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/50">
              <ShieldAlert className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-bebas text-4xl tracking-wider text-white mb-2">SECURITY UPDATE REQUIRED</h1>
            <p className="font-inter text-sm text-gray-400">
              You are currently using a temporary password. You must set a new, secure password before accessing your Digital Pass and dashboard.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm text-center font-inter">
              {error}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-5">
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="NEW PASSWORD"
                  className="w-full bg-black/30 border border-white/10 rounded-lg py-3 px-10 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-inter"
                />
              </div>
            </div>
            
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="password" 
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="CONFIRM NEW PASSWORD"
                  className="w-full bg-black/30 border border-white/10 rounded-lg py-3 px-10 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-inter"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-white text-white hover:text-primary py-3 rounded-lg font-bebas text-xl tracking-widest transition-colors flex items-center justify-center gap-2 group mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'UPDATE PASSWORD & ACTIVATE'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
