import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { ParticipantService } from '../../../services/ParticipantService';
import { TeamService } from '../../../services/TeamService';
import type { Participant, Team } from '../../../types/models';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input, Label } from '../../../components/ui/Form';
import { useToast } from '../../../components/ui/ToastContext';
import { Users, UserPlus, LogOut, Copy, Lock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ParticipantTeam() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [profile, setProfile] = useState<Participant | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [joinCode, setJoinCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [createTrack, setCreateTrack] = useState('Web Development');

  useEffect(() => {
    if (!user) return;
    const unsubProfile = ParticipantService.subscribeToParticipant(user.uid, (data) => {
      setProfile(data);
      setLoading(false);
    });
    return () => unsubProfile();
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

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await TeamService.createTeam(createName, createTrack, user.uid);
      success('Team created successfully!');
    } catch (err: any) {
      error(err.message || 'Failed to create team.');
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await TeamService.joinTeam(joinCode.toUpperCase(), user.uid);
      success('Joined team successfully!');
    } catch (err: any) {
      error(err.message || 'Failed to join team.');
    }
  };

  const handleLeaveTeam = async () => {
    if (!user || !team) return;
    try {
      await TeamService.leaveTeam(team.id, user.uid);
      success('Left team successfully.');
    } catch (err: any) {
      error(err.message || 'Failed to leave team.');
    }
  };

  const copyInviteCode = () => {
    if (team?.inviteCode) {
      navigator.clipboard.writeText(team.inviteCode);
      // Success toast would go here
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
    <div className="space-y-6">
      <div>
        <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-2">
          <Users className="w-8 h-8 text-primary" /> TEAM MANAGEMENT
        </h1>
        <p className="font-inter text-gray-400">Assemble your squad, manage members, and track your status.</p>
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
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div>
                    <Label className="text-gray-400">TEAM NAME</Label>
                    <Input 
                      value={createName} 
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="e.g. Byte Bandits" 
                      required 
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">COMPETITION TRACK</Label>
                    <select 
                      value={createTrack}
                      onChange={(e) => setCreateTrack(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50 font-inter text-sm"
                    >
                      <option className="bg-[#111]" value="Web Development">Web Development</option>
                      <option className="bg-[#111]" value="App Development">App Development</option>
                      <option className="bg-[#111]" value="AI & ML">AI & ML</option>
                      <option className="bg-[#111]" value="Blockchain">Blockchain</option>
                      <option className="bg-[#111]" value="Cybersecurity">Cybersecurity</option>
                    </select>
                  </div>
                  <Button type="submit" className="w-full mt-4">CREATE TEAM</Button>
                </form>
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
                <form onSubmit={handleJoinTeam} className="space-y-4">
                  <div>
                    <Label className="text-gray-400">INVITE CODE</Label>
                    <Input 
                      value={joinCode} 
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Enter 6-character code" 
                      className="uppercase font-mono tracking-widest text-lg"
                      maxLength={6}
                      required 
                    />
                  </div>
                  <p className="text-xs text-gray-500 font-inter">Ask your team leader for the 6-character invite code to join their squad.</p>
                  <Button type="submit" variant="secondary" className="w-full mt-4">JOIN TEAM</Button>
                </form>
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
                  <Badge variant="outline" className="text-primary border-primary/50">{team.track || 'Unassigned Track'}</Badge>
                </div>
                {team.status === 'locked' ? (
                  <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/50 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> TEAM LOCKED
                  </Badge>
                ) : (
                  <Badge variant="warning">OPEN FOR MEMBERS</Badge>
                )}
              </CardHeader>
              <CardContent>
                <h4 className="font-bebas tracking-wider text-xl text-gray-400 border-b border-white/10 pb-2 mb-4">TEAM MEMBERS</h4>
                <div className="space-y-3">
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
                          <p className="font-mono text-xs text-gray-500">{member?.glitchId || 'Pending ID'}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={member.id === team.leaderId ? 'border-primary/50 text-primary' : 'border-white/20 text-gray-400'}>
                        {member.id === team.leaderId ? 'LEADER' : 'MEMBER'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>TEAM ACTIONS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {team.status !== 'locked' && (
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
                    <p className="text-xs text-gray-500 font-inter mt-2">Share this code with members to join your team.</p>
                  </div>
                )}

                {team.status === 'locked' && (
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <h4 className="font-inter font-medium text-green-500 text-sm mb-1">TEAM IS LOCKED</h4>
                    <p className="font-inter text-xs text-green-400/70">No new members can join and current members cannot leave.</p>
                  </div>
                )}

                <div className="pt-6 border-t border-white/10">
                  <Button 
                    variant="danger" 
                    className="w-full flex items-center justify-center gap-2"
                    onClick={handleLeaveTeam}
                    disabled={team.status === 'locked'}
                  >
                    <LogOut className="w-4 h-4" /> LEAVE TEAM
                  </Button>
                  {team.status === 'locked' && (
                    <p className="text-xs text-center text-red-500/70 font-inter mt-2">You cannot leave a locked team.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
