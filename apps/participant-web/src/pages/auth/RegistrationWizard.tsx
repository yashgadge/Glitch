import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@shared/contexts/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, functions, auth } from '@shared/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '../../components/ui/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input, Label, Select } from '../../components/ui/Form';
import Stepper, { Step } from '../../components/ui/Stepper';
import { ParticipantService } from '@shared/services/ParticipantService';
import { DigitalPassService } from '@shared/services/DigitalPassService';

export default function RegistrationWizard() {
  const { user, profileData, refreshProfileStatus, loading: contextLoading } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();
  
  const [step, setStep] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFood, setShowFood] = useState(true);
  
  // Auth state for Step 0
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');

  // Profile state for Step 1
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [city, setCity] = useState('');
  const [githubId, setGithubId] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  useEffect(() => {
    if (!contextLoading && user && profileData?.registrationStatus === 'completed') {
      navigate('/dashboard');
    }
    
    if (!contextLoading && user && step === 0) {
      if (!name && profileData?.name) setName(profileData.name);
      setStep(1);
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    getDoc(doc(db, 'system', 'eventConfig')).then(docSnap => {
      if (docSnap.exists() && docSnap.data().showFoodIncluded !== undefined) {
        setShowFood(docSnap.data().showFoodIncluded);
      }
    });

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [user, profileData, contextLoading, navigate, step, name]);

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'participants', result.user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await ParticipantService.createParticipantWithCounter(result.user.uid, {
          email: result.user.email || '',
          name: result.user.displayName || 'Participant',
          status: 'pending',
          registrationStatus: 'incomplete',
          role: 'participant',
          digitalPassGenerated: false
        } as any);
      }
      await refreshProfileStatus();
      setStep(1);
    } catch (err: any) {
      error('Authentication Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      const userRef = doc(db, 'participants', result.user.uid);
      await ParticipantService.createParticipantWithCounter(result.user.uid, {
        email: result.user.email || '',
        name: authName || 'Participant',
        status: 'pending',
        registrationStatus: 'incomplete',
        role: 'participant',
        digitalPassGenerated: false
      } as any);
      await refreshProfileStatus();
      setStep(1);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        error('Account Exists', 'This email is already registered. Please sign in instead.');
      } else {
        error('Registration Failed', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Explicit validation check
    if (!name.trim() || !phone.trim() || !college.trim() || !city.trim()) {
      error('Validation Error', 'Please fill in all required fields (Name, Phone, College, and City).');
      return;
    }
    
    setLoading(true);
    try {
      // HEALING: If profileData doesn't exist (because a previous transaction failed),
      // we must create the initial document first before updating it!
      if (!profileData) {
        await ParticipantService.createParticipantWithCounter(user.uid, {
          email: user.email || '',
          name: name || 'Participant',
          status: 'pending',
          registrationStatus: 'incomplete',
          role: 'participant',
          digitalPassGenerated: false
        } as any);
      }

      await ParticipantService.updateParticipant(user.uid, {
        name,
        phone,
        college,
        city,
        githubId,
        linkedinUrl,
        registrationStatus: 'completed',
        status: 'approved'
      });
      
      await setDoc(doc(db, 'participants', user.uid), {
        registrationStatus: 'completed',
        status: 'approved',
      }, { merge: true });

      await refreshProfileStatus();
      success('Registration Complete', 'Welcome to GLITCH 36!');
      navigate('/dashboard');
    } catch (err: any) {
      error('Profile Save Failed', err.message);
    } finally {
      setLoading(false);
    }
  };


  if (contextLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-8 selection:bg-primary/50 relative overflow-y-auto">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-[#0a0a0a] to-[#0a0a0a] opacity-60"></div>
      
      <div className="w-full max-w-2xl mx-auto my-8 sm:my-12 relative z-10">
        <Link to="/" className="inline-block text-gray-400 hover:text-white mb-6 text-sm tracking-widest font-inter pl-4">
          &larr; BACK TO HOME
        </Link>
        <h2 className="text-5xl font-bebas text-white tracking-widest mb-4 text-center drop-shadow-lg">COMPLETE YOUR REGISTRATION</h2>
        
        {showFood && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-8 text-center">
            <p className="text-primary font-inter text-sm font-medium">
              ✨ Registration includes 1 Breakfast & 1 Dinner during the event! ✨
            </p>
          </div>
        )}
        
        <Stepper 
          activeStep={user ? 2 : 1}
          hideFooter={true}
          disableStepIndicators={true}
          stepCircleContainerClassName="bg-[#111] backdrop-blur-2xl border border-white/10 shadow-2xl pb-8"
        >
          <Step>
            <div className="pt-4">
              <h3 className="text-3xl font-bebas text-white tracking-widest mb-6 text-center">0. CREATE ACCOUNT</h3>
              
              <form onSubmit={handleEmailSignup} className="space-y-4 mb-4">
                <input 
                  type="text" 
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="FULL NAME"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-inter"
                />
                <input 
                  type="email" 
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="EMAIL ADDRESS"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-inter"
                />
                <input 
                  type="password" 
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="PASSWORD"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-inter"
                />
                <Button isLoading={loading} type="submit" className="w-full">CREATE ACCOUNT</Button>
              </form>

              <div className="flex items-center py-2">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="mx-4 text-gray-500 text-sm font-inter">OR</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full mt-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-lg font-inter text-sm tracking-wide transition-colors flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                CONTINUE WITH GOOGLE
              </button>

              <div className="mt-4 text-center">
                <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors font-inter">
                  ALREADY HAVE AN ACCOUNT? SIGN IN
                </Link>
              </div>
            </div>
          </Step>

          <Step>
            <div className="pt-4">
              <h3 className="text-3xl font-bebas text-white tracking-widest mb-2 text-center">1. PROFILE VERIFICATION</h3>
              <p className="text-sm text-gray-400 font-inter mb-8 text-center">Complete your identity record to proceed.</p>
              
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>FULL NAME <span className="text-red-500">*</span></Label>
                    <Input required value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>EMAIL ADDRESS (UNIQUE ID) <span className="text-red-500">*</span></Label>
                    <div className="flex gap-2 items-center">
                      <Input disabled value={user?.email || ''} className="opacity-50 cursor-not-allowed bg-black/50 flex-1" />
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="text-xs border-primary/50 text-primary hover:bg-primary/10 whitespace-nowrap"
                        onClick={() => auth.signOut()}
                      >
                        CHANGE ACCOUNT
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">If this is the wrong email, click Change Account to sign in with a different one.</p>
                  </div>
                  <div>
                    <Label>PHONE NUMBER <span className="text-red-500">*</span></Label>
                    <Input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" />
                  </div>
                  <div>
                    <Label>COLLEGE / UNIVERSITY <span className="text-red-500">*</span></Label>
                    <Input required value={college} onChange={e => setCollege(e.target.value)} placeholder="Institute of Technology" />
                  </div>
                  <div>
                    <Label>CITY <span className="text-red-500">*</span></Label>
                    <Input required value={city} onChange={e => setCity(e.target.value)} placeholder="Mumbai" />
                  </div>

                  <div>
                    <Label>GITHUB USERNAME (Optional)</Label>
                    <Input value={githubId} onChange={e => setGithubId(e.target.value)} placeholder="johndoe" />
                  </div>
                  <div>
                    <Label>LINKEDIN URL (Optional)</Label>
                    <Input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-white/10">
                  <Button isLoading={loading} type="submit" className="w-full">SAVE PROFILE & CONTINUE</Button>
                </div>
              </form>
            </div>
          </Step>
        </Stepper>
      </div>
    </div>
  );
}
