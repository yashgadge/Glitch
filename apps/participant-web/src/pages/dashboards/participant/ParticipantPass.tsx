import React, { useState, useEffect } from 'react';
import { useAuth } from '@shared/contexts/AuthContext';
import { DigitalPassService } from '@shared/services/DigitalPassService';
import { ParticipantService } from '@shared/services/ParticipantService';
import { TeamService } from '@shared/services/TeamService';
import type { DigitalPass as DigitalPassModel, Participant, Team } from '@shared/types/models';
import DigitalPass from '../../../components/pass/DigitalPass';
import { Card, CardContent } from '../../../components/ui/Card';
import { QrCode, AlertTriangle, Users } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/ToastContext';
import { motion } from 'framer-motion';

export default function ParticipantPass() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [pass, setPass] = useState<DigitalPassModel | null>(null);
  const [profile, setProfile] = useState<Participant | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  
  const [passLoading, setPassLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubProfile = ParticipantService.subscribeToParticipant(user.uid, (data) => {
      setProfile(data);
      setProfileLoading(false);
    });
    
    const unsubPass = DigitalPassService.subscribeToPass(user.uid, async (data) => {
      setPass(data || null);
      setPassLoading(false);
    });

    return () => {
      unsubProfile();
      unsubPass();
    };
  }, [user]);

  useEffect(() => {
    if (profile?.teamId) {
      setTeamLoading(true);
      const unsubTeam = TeamService.subscribeToTeam(profile.teamId, (data) => {
        setTeam(data);
        setTeamLoading(false);
      });
      return () => unsubTeam();
    } else {
      setTeam(null);
      setTeamLoading(false);
    }
  }, [profile?.teamId]);

  const isLoading = profileLoading || passLoading || (!!profile?.teamId && teamLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const handleDownloadPass = async () => {
    const element = document.getElementById('digital-pass-container');
    if (!element) return;
    
    // We import it dynamically to avoid SSR issues if this was SSR, but also it's just cleaner for large libs
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin:       0,
        filename:     `GLITCH36_Pass_${profile?.name || 'Participant'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#000000' },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      html2pdf().set(opt).from(element).save();
      success('Pass downloaded successfully!');
    } catch (err) {
      console.error(err);
      error('Failed to download pass. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-2">
          <QrCode className="w-8 h-8 text-primary" /> DIGITAL PASS
        </h1>
        <p className="font-inter text-gray-400">Your secure access credential for the venue and events.</p>
      </div>

      <div className="w-full flex justify-center py-8">
        {!profile?.teamId ? (
          <Card className="max-w-md w-full border border-gray-500/30 bg-gray-900/50">
            <CardContent className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="font-bebas text-2xl text-white mb-2 tracking-wider">NO TEAM — DIGITAL PASS UNAVAILABLE</h3>
              <p className="font-inter text-gray-400 text-sm leading-relaxed mb-6">
                Join or create a team first. Your Digital Pass will be issued after your team registration is confirmed and payment is completed.
              </p>
              <Button 
                onClick={() => navigate('/dashboard/team')} 
                className="bg-primary hover:bg-primary/90 text-white font-bebas tracking-widest text-lg px-8 py-6 rounded-md shadow-[0_0_15px_rgba(220,38,38,0.5)] hover:shadow-[0_0_25px_rgba(220,38,38,0.7)] transition-all duration-300 transform hover:scale-105 active:scale-95 group flex items-center justify-center gap-3"
              >
                <Users className="w-5 h-5 group-hover:animate-pulse" />
                CREATE / JOIN TEAM
              </Button>
            </CardContent>
          </Card>
        ) : !team || !team.memberIds?.includes(user?.uid || '') ? (
          <Card className="max-w-md w-full border border-red-500/30 bg-red-950/20">
            <CardContent className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="font-bebas text-2xl text-white mb-2 tracking-wider">INVALID TEAM MEMBERSHIP</h3>
              <p className="font-inter text-gray-400 text-sm leading-relaxed mb-6">
                You are not currently listed as a valid member of this team.
              </p>
            </CardContent>
          </Card>
        ) : (team.paymentStatus !== 'paid' && team.paymentStatus !== 'PAID') ? (
          <Card className="max-w-md w-full border border-red-500/30 bg-red-950/20">
            <CardContent className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="font-bebas text-2xl text-white mb-2 tracking-wider">REGISTRATION PAYMENT PENDING</h3>
              <p className="font-inter text-gray-400 text-sm leading-relaxed mb-6">
                The Team Leader must complete the team registration payment before passes are generated.
              </p>
              {team.leaderId === user?.uid ? (
                <Button onClick={() => navigate('/dashboard/team')} variant="outline" className="border-red-500/50 text-red-400">
                  COMPLETE REGISTRATION PAYMENT
                </Button>
              ) : (
                <Badge variant="outline" className="border-red-500/50 text-red-400 bg-red-500/10 px-4 py-1.5 text-sm">
                  ASK YOUR TEAM LEADER TO COMPLETE PAYMENT
                </Badge>
              )}
            </CardContent>
          </Card>
        ) : pass && pass.status === 'active' && !pass.isRevoked ? (
          <div className="flex flex-col items-center gap-6">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} id="digital-pass-container">
              <DigitalPass participantData={{
                participantId: profile?.glitchId || pass.participantId,
                name: profile?.name || 'Hacker',
                teamName: team?.name || 'Independent',
                track: team?.track || undefined,
                college: profile?.college || undefined,
                status: pass.status,
                role: 'participant',
                qrData: JSON.stringify({
                  participantId: profile?.glitchId || pass.participantId,
                  teamId: profile?.teamId || '',
                  token: profile?.qrToken || pass.token,
                  version: profile?.qrVersion || pass.version
                })
              }} />
            </motion.div>
            <Button onClick={handleDownloadPass} className="w-full max-w-sm">
              DOWNLOAD PDF
            </Button>
          </div>
        ) : (
          <Card className="max-w-md w-full border-dashed border-2 border-white/20 bg-black/50">
            <CardContent className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="font-bebas text-2xl text-white mb-2 tracking-wider">PASS GENERATION PENDING</h3>
              <p className="font-inter text-gray-400 text-sm leading-relaxed">
                Your Digital Pass has not yet been generated by the backend. Passes are automatically issued when your registration is approved.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
