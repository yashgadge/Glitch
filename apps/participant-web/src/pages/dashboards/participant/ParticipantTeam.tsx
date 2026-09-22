import React, { useState, useEffect } from 'react';
import { useAuth } from '@shared/contexts/AuthContext';
import { ParticipantService } from '@shared/services/ParticipantService';
import { TeamService } from '@shared/services/TeamService';
import type { Participant, Team } from '@shared/types/models';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input, Label } from '../../../components/ui/Form';
import { useToast } from '../../../components/ui/ToastContext';
import { Users, UserPlus, LogOut, Copy, Lock, AlertTriangle, ShieldCheck, Check, X, CreditCard, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getDoc, doc } from 'firebase/firestore';
import { db, functions } from '@shared/lib/firebase';
import { httpsCallable } from 'firebase/functions';

export default function ParticipantTeam() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [profile, setProfile] = useState<Participant | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Participant[]>([]);
  const [pendingMembers, setPendingMembers] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [feeAmount, setFeeAmount] = useState<number>(599);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);

  // Form State
  const [joinCode, setJoinCode] = useState('');
  const [createName, setCreateName] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubProfile = ParticipantService.subscribeToParticipant(user.uid, (data) => {
      setProfile(data);
      setLoading(false);
    });

    // Fetch config for dynamic fee and registration status
    getDoc(doc(db, 'system', 'eventConfig')).then(docSnap => {
      if (docSnap.exists()) {
        const config = docSnap.data();
        if (config.registrationFeeAmount !== undefined) {
          setFeeAmount(config.registrationFeeAmount);
        }
        if (config.isRegistrationOpen !== undefined) {
          setIsRegistrationOpen(config.isRegistrationOpen);
        }
      }
    }).catch(err => console.error("Error fetching config:", err));
    
    // Load Razorpay Script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      unsubProfile();
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [user]);

  useEffect(() => {
    if (profile?.teamId) {
      const unsubTeam = TeamService.subscribeToTeam(profile.teamId, (data) => setTeam(data));
      const unsubMembers = ParticipantService.subscribeToTeamMembers(profile.teamId, (data) => setMembers(data));
      return () => {
        unsubTeam();
        unsubMembers();
      };
    } else {
      setTeam(null);
      setMembers([]);
    }
  }, [profile?.teamId]);

  // Fetch pending members when team.pendingMemberIds changes
  useEffect(() => {
    async function fetchPending() {
      if (team?.pendingMemberIds && team.pendingMemberIds.length > 0) {
        const pending = await ParticipantService.getParticipantsByIds(team.pendingMemberIds);
        setPendingMembers(pending);
      } else {
        setPendingMembers([]);
      }
    }
    fetchPending();
  }, [team?.pendingMemberIds]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsProcessing(true);
    try {
      await TeamService.createTeam(createName, "", user.uid);
      success('Team created successfully!');
    } catch (err: any) {
      error(err.message || 'Failed to create team.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsProcessing(true);
    try {
      await TeamService.requestJoinTeam(joinCode.toUpperCase(), user.uid);
      success('Join request sent successfully!');
      setJoinCode('');
    } catch (err: any) {
      error(err.message || 'Failed to send join request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptMember = async (memberId: string) => {
    if (!user || !team) return;
    setIsProcessing(true);
    try {
      await TeamService.acceptTeamMember(team.id, memberId, user.uid);
      success('Member accepted!');
    } catch (err: any) {
      error(err.message || 'Failed to accept member.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectMember = async (memberId: string) => {
    if (!user || !team) return;
    setIsProcessing(true);
    try {
      await TeamService.rejectTeamMember(team.id, memberId, user.uid);
      success('Join request rejected.');
    } catch (err: any) {
      error(err.message || 'Failed to reject member.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user || !team) return;
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    setIsProcessing(true);
    try {
      await TeamService.removeTeamMember(team.id, memberId, user.uid);
      success('Member removed.');
    } catch (err: any) {
      error(err.message || 'Failed to remove member.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!user || !team) return;
    if (!window.confirm("Are you sure you want to leave this team?")) return;
    setIsProcessing(true);
    try {
      await TeamService.leaveTeam(team.id, user.uid);
      success('Left team successfully.');
    } catch (err: any) {
      error(err.message || 'Failed to leave team.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayAndLock = async () => {
    if (!user || !team) return;
    if (!window.confirm("Proceed to pay the team registration fee? Your team members will be locked after payment.")) return;
    setIsProcessing(true);
    try {
      const createOrderCallable = httpsCallable(functions, 'createRazorpayOrder');
      const { data: rzpOrder } = await createOrderCallable({
        items: [{ id: 'registration-fee', quantity: 1 }],
        notes: { teamId: team.id, participantId: user.uid }
      }) as any;
      
      const firestoreOrderId = rzpOrder.firestoreOrderId;
      if (!firestoreOrderId) {
        throw new Error("Failed to initialize order on server.");
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'mock_key_id',
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: 'GLITCH 36',
        description: 'Team Registration Fee',
        order_id: rzpOrder.id,
        handler: async function (response: any) {
          success('Payment Processing', 'Verifying your payment...');
          try {
            const verifyPaymentCallable = httpsCallable(functions, 'verifyRazorpayPayment');
            await verifyPaymentCallable({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: firestoreOrderId
            });
            success('Registration Confirmed', 'Your team registration is now complete and locked.');
          } catch (verifyErr: any) {
            error(verifyErr.message || 'Payment verification failed.');
          }
        },
        prefill: {
          name: profile?.name || '',
          email: profile?.email || '',
          contact: profile?.phone || profile?.mobile || ''
        },
        theme: {
          color: '#E30613'
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
            error('Payment Cancelled', 'Registration fee payment was not completed.');
          }
        }
      };

      if (options.key === 'mock_key_id') {
        error('Payment Gateway Error', 'Razorpay is not configured. Mock payments are disabled in production.');
        setIsProcessing(false);
      } else {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any){
          error('Payment Failed', response.error.description);
          setIsProcessing(false);
        });
        rzp.open();
      }
    } catch (err: any) {
      error(err.message || 'Failed to initiate payment.');
      setIsProcessing(false);
    }
  };

  const copyInviteCode = () => {
    if (team?.inviteCode) {
      navigator.clipboard.writeText(team.inviteCode);
      success('Invite code copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isLeader = team?.leaderId === user?.uid;
  const isLocked = team?.paymentStatus?.toUpperCase() === 'PAID' || team?.status?.toLowerCase() === 'locked';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-2">
          <Users className="w-8 h-8 text-primary" /> TEAM MANAGEMENT
        </h1>
        <p className="font-inter text-gray-400">Assemble your squad, manage members, and finalize your registration.</p>
      </div>

      {!team ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="h-full border-primary/20 bg-black/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" /> CREATE A NEW TEAM
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isRegistrationOpen ? (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="font-inter text-sm text-red-400">Registration is currently closed. You cannot create a new team at this time.</p>
                  </div>
                ) : (
                  <form onSubmit={handleCreateTeam} className="space-y-4">
                    <div>
                      <Label className="text-gray-400">TEAM NAME</Label>
                      <Input 
                        value={createName} 
                        onChange={(e) => setCreateName(e.target.value)}
                        placeholder="e.g. Byte Bandits" 
                        required 
                        disabled={isProcessing}
                      />
                    </div>
                    <Button isLoading={isProcessing} type="submit" className="w-full mt-4">CREATE TEAM</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="h-full border-blue-500/20 bg-black/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" /> JOIN EXISTING TEAM
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isRegistrationOpen ? (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="font-inter text-sm text-red-400">Registration is currently closed. You cannot join a team at this time.</p>
                  </div>
                ) : (
                  <form onSubmit={handleRequestJoin} className="space-y-4">
                    <div>
                      <Label className="text-gray-400">INVITE CODE</Label>
                      <Input 
                        value={joinCode} 
                        onChange={(e) => setJoinCode(e.target.value)}
                        placeholder="Enter 6-character code" 
                        className="uppercase font-mono tracking-widest text-lg"
                        maxLength={6}
                        required 
                        disabled={isProcessing}
                      />
                    </div>
                    <p className="text-xs text-gray-500 font-inter">Ask your team leader for the 6-character invite code to join their squad.</p>
                    <Button isLoading={isProcessing} type="submit" variant="secondary" className="w-full mt-4">REQUEST TO JOIN</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-bebas tracking-wider text-white mb-1">{team.name || 'Unnamed Team'}</CardTitle>
                  {team.track ? (
                    <Badge variant="outline" className="text-primary border-primary/50">{team.track}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">NO TRACK SELECTED - PLEASE SELECT FROM TRACKS MENU</Badge>
                  )}
                </div>
                {isLocked ? (
                  <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/50 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> TEAM LOCKED & PAID
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
                    TEAM UNLOCKED
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <h4 className="font-bebas tracking-wider text-xl text-gray-400 border-b border-white/10 pb-2 mb-4 flex justify-between items-center">
                  <span>TEAM MEMBERS ({members.length}/4)</span>
                </h4>
                
                <div className="space-y-3 mb-6">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-inter text-sm font-medium text-white flex items-center gap-2">
                            {member?.name || 'Unknown Member'}
                            {member?.id === team.leaderId && <ShieldCheck className="w-4 h-4 text-primary" title="Team Leader" />}
                          </p>
                          <p className="font-mono text-xs text-gray-500">{member?.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={member.id === team.leaderId ? 'border-primary/50 text-primary' : 'border-white/20 text-gray-400'}>
                          {member.id === team.leaderId ? 'LEADER' : 'MEMBER'}
                        </Badge>
                        {isLeader && member.id !== user?.uid && !isLocked && (
                          <Button 
                            variant="danger" 
                            size="sm" 
                            className="px-2 py-1 h-auto text-xs" 
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={isProcessing}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {isLeader && pendingMembers.length > 0 && !isLocked && (
                  <div className="mt-8">
                    <h4 className="font-bebas tracking-wider text-xl text-yellow-500 border-b border-yellow-500/20 pb-2 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" /> PENDING REQUESTS
                    </h4>
                    <div className="space-y-3">
                      {pendingMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-black/50 border border-yellow-500/20 flex items-center justify-center">
                              <UserPlus className="w-5 h-5 text-yellow-500" />
                            </div>
                            <div>
                              <p className="font-inter text-sm font-medium text-white">{member?.name || 'Unknown Member'}</p>
                              <p className="font-mono text-xs text-gray-400">{member?.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="px-2 py-1 h-auto text-xs bg-red-500/20 text-red-500 hover:bg-red-500/30 border-0" 
                              onClick={() => handleRejectMember(member.id)}
                              disabled={isProcessing}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              className="px-2 py-1 h-auto text-xs bg-green-500 text-black hover:bg-green-400 border-0" 
                              onClick={() => handleAcceptMember(member.id)}
                              disabled={isProcessing || members.length >= 4}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>TEAM ACTIONS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {!isLocked && isLeader && (
                  <div>
                    <Label className="text-gray-400 mb-2 block">INVITE CODE</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-black/50 border border-white/10 rounded-lg flex items-center justify-center font-mono text-xl tracking-widest text-primary p-2">
                        {team.inviteCode}
                      </div>
                      <Button variant="secondary" className="px-3" onClick={copyInviteCode}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 font-inter mt-2">Share this code with members to request to join your team.</p>
                  </div>
                )}

                {isLocked && (
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <h4 className="font-inter font-medium text-green-500 text-sm mb-1 flex items-center gap-1">
                      <Lock className="w-4 h-4" /> TEAM IS LOCKED
                    </h4>
                    <p className="font-inter text-xs text-green-400/70">Registration payment is complete. No new members can join and current members cannot leave.</p>
                  </div>
                )}

                {!isLocked && isLeader && (
                  <div className="pt-6 border-t border-white/10">
                    <div className="mb-6">
                      <h4 className="font-bebas text-2xl text-white tracking-widest mb-4">FINALIZE REGISTRATION</h4>
                      
                      {!isRegistrationOpen && (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
                          <p className="font-inter text-sm text-red-400 font-medium">
                            Registration is currently closed. You cannot pay the registration fee or lock the team at this time.
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between p-4 bg-black/50 border border-white/10 rounded-lg mb-4">
                        <span className="font-bebas text-xl text-gray-300 tracking-widest">REGISTRATION FEE</span>
                        <span className="font-bebas text-4xl text-primary tracking-wider drop-shadow-[0_0_10px_rgba(227,6,19,0.5)]">₹{feeAmount}</span>
                      </div>

                      <Button 
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-500 text-white border-0 hover:from-green-500 hover:to-green-400 py-6 text-lg mb-4"
                        onClick={handlePayAndLock}
                        disabled={isProcessing || !isRegistrationOpen}
                        isLoading={isProcessing}
                      >
                        <CreditCard className="w-5 h-5" /> PAY REGISTRATION FEE
                      </Button>
                      
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <span className="font-bebas text-xl text-red-500 tracking-wider">CRITICAL WARNING</span>
                        </div>
                        <p className="font-inter text-sm text-red-400/90 leading-relaxed">
                          Once payment is complete, your team will be <strong className="text-white">PERMANENTLY LOCKED</strong>. You will NOT be able to add or remove members later. Ensure all {members.length}/4 members have successfully joined before proceeding.
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-3 text-xs text-primary font-inter justify-center">
                        <a href="/terms" target="_blank" className="hover:text-white underline">Terms & Conditions</a>
                        <span className="text-gray-600">|</span>
                        <a href="/refund-policy" target="_blank" className="hover:text-white underline">Refund Policy</a>
                      </div>
                    </div>
                  </div>
                )}

                {!isLocked && !isLeader && (
                  <div className="pt-6 border-t border-white/10">
                    <Button 
                      variant="danger" 
                      className="w-full flex items-center justify-center gap-2"
                      onClick={handleLeaveTeam}
                      disabled={isProcessing}
                      isLoading={isProcessing}
                    >
                      <LogOut className="w-4 h-4" /> LEAVE TEAM
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
