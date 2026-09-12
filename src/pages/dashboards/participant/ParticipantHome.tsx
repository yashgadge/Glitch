import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Code2, Clock, Megaphone, FileText, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { ParticipantService } from '../../../services/ParticipantService';
import { TeamService } from '../../../services/TeamService';
import { AnnouncementService } from '../../../services/AnnouncementService';
import { EventConfigService } from '../../../services/EventConfigService';
import type { Participant, Team, Announcement, EventConfig } from '../../../types/models';

export default function ParticipantHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Participant | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [eventConfig, setEventConfig] = useState<EventConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubProfile = ParticipantService.subscribeToParticipant(user.uid, (data) => {
      setProfile(data);
      setLoading(false);
    });

    const unsubAnnouncements = AnnouncementService.subscribeToAnnouncements('participant', (data) => {
      // Only show top 2 general/participant announcements
      const filtered = data
        .filter(a => a.target === 'all' || a.target === 'participants' || a.target === 'teams')
        .slice(0, 2);
      setAnnouncements(filtered);
    });

    const unsubConfig = EventConfigService.subscribeToConfig((config) => {
      setEventConfig(config);
    });

    return () => {
      unsubProfile();
      unsubAnnouncements();
      unsubConfig();
    };
  }, [user]);

  // Separate effect for team subscription once we have the teamId
  useEffect(() => {
    if (profile?.teamId) {
      const unsubTeam = TeamService.subscribeToTeam(profile.teamId, (data) => {
        setTeam(data);
      });
      return () => unsubTeam();
    } else {
      setTeam(null);
    }
  }, [profile?.teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072')] bg-cover bg-center rounded-2xl overflow-hidden relative border border-white/10"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent" />
        <div className="relative p-8 lg:p-12 z-10 w-full max-w-2xl">
          <Badge variant="outline" className="mb-4">
            {eventConfig?.registrationOpen ? 'REGISTRATION OPEN' : 'REGISTRATION CLOSED'}
          </Badge>
          <h1 className="font-bebas text-4xl lg:text-5xl tracking-widest text-white mb-4">
            WELCOME TO <span className="text-primary drop-shadow-[0_0_15px_rgba(227,6,19,0.5)]">GLITCH 36</span>
          </h1>
          <p className="font-inter text-gray-300 text-lg mb-8 leading-relaxed">
            Hello, <span className="text-white font-medium">{profile?.name || 'Hacker'}</span>. 
            Prepare yourself for 36 hours of relentless innovation. Ensure your team is locked and your profile is complete.
          </p>
          <div className="flex gap-4">
            {!team ? (
              <Link to="/dashboard/team">
                <Button>ASSEMBLE TEAM</Button>
              </Link>
            ) : (
              <Link to="/dashboard/submission">
                <Button>SUBMISSION PORTAL</Button>
              </Link>
            )}
            <Link to="/dashboard/pass">
              <Button variant="secondary">VIEW DIGITAL PASS</Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Team Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  team?.eliminated || team?.disqualified ? 'bg-red-500/10' :
                  team ? 'bg-green-500/10' : 'bg-primary/10'
                }`}>
                  <Users className={`w-6 h-6 ${
                    team?.eliminated || team?.disqualified ? 'text-red-500' :
                    team ? 'text-green-500' : 'text-primary'
                  }`} />
                </div>
                {team?.disqualified ? (
                  <Badge variant="danger">DISQUALIFIED</Badge>
                ) : team?.eliminated ? (
                  <Badge variant="danger">ELIMINATED</Badge>
                ) : team?.isWinner ? (
                  <Badge variant="success">WINNER</Badge>
                ) : team ? (
                  <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/50">ACTIVE</Badge>
                ) : (
                  <Badge variant="warning">ACTION REQUIRED</Badge>
                )}
              </div>
              <h3 className="font-bebas text-2xl tracking-wider text-white mb-1">TEAM STATUS</h3>
              {team ? (
                <div className="mb-4">
                  <p className="font-inter text-sm text-white font-medium">{team.name}</p>
                  <p className="font-inter text-xs text-gray-400 uppercase tracking-wider mb-2">
                    {team.eliminated ? `Eliminated in Round ${team.currentRound}` : team.status === 'held' ? 'ON HOLD' : `Round ${team.currentRound} - ${team.track}`}
                  </p>
                  <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                    <span className="font-inter text-xs text-gray-400 uppercase tracking-wider">Current Score</span>
                    <span className="font-mono text-sm text-white">{team.score || 0}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-2 rounded mt-1">
                    <span className="font-inter text-xs text-gray-400 uppercase tracking-wider">Overall Rank</span>
                    <span className="font-mono text-sm text-primary">#{team.rank || '-'}</span>
                  </div>
                </div>
              ) : (
                <p className="font-inter text-sm text-gray-400 mb-4">You are not in a team yet. Join or create one.</p>
              )}
              
              <Link to="/dashboard/team" className={`${team?.eliminated || team?.disqualified ? 'text-red-500 hover:text-red-400' : team ? 'text-green-500 hover:text-green-400' : 'text-primary hover:text-white'} text-sm font-medium transition-colors flex items-center`}>
                {team ? 'View Team' : 'Manage Team'} <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Submission Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Code2 className="w-6 h-6 text-blue-400" />
                </div>
                <Badge variant="outline">PENDING</Badge>
              </div>
              <h3 className="font-bebas text-2xl tracking-wider text-white mb-1">PROJECT SUBMISSION</h3>
              {team?.eliminated || team?.disqualified ? (
                <p className="font-inter text-sm text-red-400 mb-4">Submission locked due to {team.disqualified ? 'disqualification' : 'elimination'}.</p>
              ) : (
                <p className="font-inter text-sm text-gray-400 mb-4">Submission portal is ready for your draft.</p>
              )}
              <Link to="/dashboard/submission" className="text-blue-400 text-sm font-medium hover:text-white transition-colors flex items-center">
                Open Portal <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Event Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-400" />
                </div>
                <Badge variant="default" className="bg-purple-500/20 text-purple-400 border-purple-500/50">ACTIVE</Badge>
              </div>
              <div className="flex-1">
                <h3 className="font-bebas text-2xl tracking-wider text-white mb-1">CURRENT ROUND</h3>
                <p className="font-inter text-sm text-gray-400 mb-4 font-mono">
                  {eventConfig?.currentRound ? `ROUND ${eventConfig.currentRound}` : 'AWAITING COMMENCEMENT'}
                </p>
              </div>
              <Link to="/dashboard/schedule" className="text-purple-400 text-sm font-medium hover:text-white transition-colors flex items-center">
                View Schedule <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Pipeline Status */}
      <Card className="bg-black/50 border-primary/20">
        <CardContent className="p-8">
          <h3 className="font-bebas text-2xl tracking-wider text-white mb-6">EVENT PIPELINE</h3>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/10 -translate-y-1/2 hidden md:block z-0"></div>
            
            {[
              { label: 'Imported', active: true, done: true },
              { label: 'Profile Completed', active: profile?.profileCompleted, done: profile?.profileCompleted },
              { label: 'Checked In', active: profile?.checkedIn, done: profile?.checkedIn },
              { label: 'Qualified', active: team?.qualified, done: team?.qualified, error: team?.eliminated },
              { label: 'Final Ranking', active: team?.rank, done: team?.rank },
              { label: 'Certificate', active: team?.isWinner || team?.isFinalist, done: false }
            ].map((step, idx) => (
              <div key={idx} className="relative z-10 flex flex-row md:flex-col items-center gap-4 md:gap-2 bg-black md:px-2 mb-4 md:mb-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step.error ? 'border-red-500 bg-red-500/20' :
                  step.done ? 'border-green-500 bg-green-500/20' : 
                  step.active ? 'border-primary bg-primary/20' : 'border-gray-600 bg-gray-900'
                }`}>
                  {step.error ? <div className="w-3 h-3 rounded-full bg-red-500" /> :
                   step.done ? <div className="w-3 h-3 rounded-full bg-green-500" /> :
                   step.active ? <div className="w-3 h-3 rounded-full bg-primary animate-pulse" /> : null}
                </div>
                <span className={`text-xs font-inter uppercase tracking-wider ${
                  step.error ? 'text-red-500' :
                  step.done ? 'text-green-500' :
                  step.active ? 'text-white' : 'text-gray-500'
                }`}>{step.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Announcements & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-primary" />
                  <h3 className="font-bebas text-2xl tracking-wider text-white">LATEST ANNOUNCEMENTS</h3>
                </div>
                <Link to="/dashboard/announcements" className="text-sm font-inter text-gray-400 hover:text-white">View All</Link>
              </div>
              
              <div className="space-y-4">
                {announcements.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 font-inter text-sm">
                    No active announcements.
                  </div>
                ) : (
                  announcements.map((a) => (
                    <div key={a.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-inter font-medium text-white text-sm">{a.title}</h4>
                        <span className="text-xs text-gray-500 font-inter">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="font-inter text-sm text-gray-400">{a.content}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <FileText className="w-5 h-5 text-white" />
                <h3 className="font-bebas text-2xl tracking-wider text-white">QUICK ACTIONS</h3>
              </div>
              <div className="flex flex-col gap-3">
                <Link to="/dashboard/pass" className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors font-inter text-sm text-white flex justify-between items-center group">
                  Scan Digital Pass <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                </Link>
                <Link to="/dashboard/resources" className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors font-inter text-sm text-white flex justify-between items-center group">
                  Download Rulebook <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                </Link>
                <Link to="/dashboard/profile" className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors font-inter text-sm text-white flex justify-between items-center group">
                  Update Profile <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
