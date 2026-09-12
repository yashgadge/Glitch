import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@shared/lib/firebase';
import { useAuth } from '@shared/contexts/AuthContext';
import { ParticipantService } from '@shared/services/ParticipantService';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, activeRole, profileData, refreshProfileStatus } = useAuth();

  React.useEffect(() => {
    if (user) {
      if (activeRole === 'participant' || !activeRole) {
        if (!profileData || profileData?.registrationStatus === 'incomplete') {
          navigate('/register');
        } else if (profileData?.registrationStatus === 'completed') {
          navigate('/dashboard');
        }
      } else if (activeRole !== 'participant') {
        setError('Access Denied. Please ensure you are using a valid participant account.');
      }
    }
  }, [user, activeRole, profileData, navigate]);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Auto-provision minimal participant identity if missing
      const userRef = doc(db, 'participants', result.user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await ParticipantService.createParticipantWithCounter(result.user.uid, {
          email: result.user.email || '',
          name: result.user.displayName || 'Participant',
          status: 'pending', // NOT approved yet
          registrationStatus: 'incomplete', // Requires wizard
          role: 'participant',
          digitalPassGenerated: false
        } as any);
      }
      
      // Wait for AuthContext to pick up the new role.
      // The useEffect above will handle the safe routing to /register or /dashboard.
      await refreshProfileStatus();

    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('');
      } else {
        setError(err.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Auto-provision minimal participant identity if missing
      const userRef = doc(db, 'participants', result.user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await ParticipantService.createParticipantWithCounter(result.user.uid, {
          email: result.user.email || '',
          name: 'Participant',
          status: 'pending', // NOT approved
          registrationStatus: 'incomplete', // Requires wizard
          role: 'participant',
          digitalPassGenerated: false
        } as any);
      }

      // The useEffect above will handle the safe routing.
      await refreshProfileStatus();

    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password. If you don't have an account, please register.");
      } else {
        setError(err.message || 'Failed to log in');
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-8 selection:bg-primary/50 relative overflow-y-auto">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-[#0a0a0a] to-[#0a0a0a] opacity-60"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md mx-auto my-8 sm:my-12 relative z-10"
      >
        <Link to="/" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="font-inter text-sm tracking-widest">BACK TO MISSION CONTROL</span>
        </Link>

        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 sm:p-10 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <div className="mb-8 sm:mb-10 text-center">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-block p-3 rounded-2xl bg-primary/20 text-primary mb-4"
            >
              <LogIn className="w-8 h-8" />
            </motion.div>
            <h1 className="font-bebas text-5xl tracking-widest text-white mb-3">PARTICIPANT LOGIN</h1>
            <p className="font-inter text-gray-400">Welcome back! Sign in to access your dashboard.</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-primary/20 border border-primary/50 rounded-lg text-primary text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="email" 
                  name="participant-email"
                  autoComplete="off"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="EMAIL ADDRESS"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-12 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-inter"
                />
              </div>
            </div>

            <div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="password" 
                  name="participant-password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="PASSWORD"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-12 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-inter"
                />
              </div>
              <div className="mt-4 text-right">
                <Link to="/forgot-password" className="text-sm text-gray-400 hover:text-primary transition-colors font-medium">
                  Forgot Password?
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-white text-white hover:text-primary py-4 rounded-xl font-bebas text-2xl tracking-widest transition-colors flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(255,51,51,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    SIGN IN
                    <ArrowLeft className="w-5 h-5 rotate-180 transition-transform group-hover:translate-x-2" />
                  </>
                )}
              </motion.button>
              
              <div className="text-center bg-black/40 p-3 rounded-xl border border-white/5">
                <p className="text-gray-400 font-inter text-sm mb-2">Don't have an account yet?</p>
                <Link to="/register">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className="bg-white text-black font-bebas text-lg px-6 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    REGISTER NOW
                  </motion.button>
                </Link>
              </div>

              <div className="relative flex items-center my-1">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-gray-500 text-sm font-inter">OR</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white/5 border border-white/20 text-white py-4 rounded-xl font-inter text-sm font-medium tracking-wide transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                CONTINUE WITH GOOGLE
              </motion.button>
            </div>
          </form>


        </div>
      </motion.div>
    </div>
  );
}

