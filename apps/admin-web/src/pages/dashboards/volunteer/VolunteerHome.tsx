import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ScanLine, Search, LayoutGrid, Clock, Users, Package, Bell, MapPin, CheckCircle2, ChevronRight, User } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { ParticipantService } from '@shared/services/ParticipantService';
import { AnnouncementService } from '@shared/services/AnnouncementService';
import { RoundService } from '@shared/services/RoundService';
import { ClassroomService } from '@shared/services/ClassroomService';
import { AuditService } from '@shared/services/AuditService';
import type { Staff, Announcement, Round, AuditLog } from '@shared/types/models';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@shared/lib/firebase';
import { motion } from 'framer-motion';

export default function VolunteerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Staff | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [stats, setStats] = useState({
    expected: 0,
    checkedIn: 0,
    teamsTotal: 0,
    teamsSubmitted: 0
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [activeClassroomsCount, setActiveClassroomsCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    
    const fetchInitial = async () => {
      const staff = await ParticipantService.getStaffProfile(user.uid);
      setProfile(staff);
    };
    fetchInitial();

    const unsubRound = RoundService.subscribeToActiveRound((r) => setCurrentRound(r));

    const qPart = query(collection(db, 'participants'), where('roles', 'array-contains', 'participant'));
    const unsubPart = onSnapshot(qPart, (snap) => {
      let expected = snap.docs.length;
      let checkedIn = snap.docs.filter(d => d.data().checkedIn).length;
      setStats(s => ({ ...s, expected, checkedIn }));
    });

    const qTeam = query(collection(db, 'teams'), where('status', 'not-in', ['eliminated', 'disqualified']));
    const unsubTeam = onSnapshot(qTeam, (snap) => {
      setStats(s => ({ ...s, teamsTotal: snap.docs.length }));
    });

    const qAnn = AnnouncementService.subscribeToAnnouncements('volunteer', (data) => {
      setAnnouncements(data.slice(0, 3));
    });
    
    let unsubLogs: () => void;
    if (user.uid) {
      unsubLogs = AuditService.getLogsForActor(user.uid, (logs) => {
        setRecentActivity(logs.slice(0, 5));
      });
    }

    const unsubClassrooms = ClassroomService.subscribeToAllClassrooms((classrooms) => {
      setActiveClassroomsCount(classrooms.filter(c => c.active).length);
    });

    return () => {
      unsubRound();
      unsubPart();
      unsubTeam();
      qAnn();
      if (unsubLogs) unsubLogs();
      unsubClassrooms();
    };
  }, [user]);

  if (!profile) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto space-y-6 pb-20"
    >
      <div className="flex justify-between items-end border-b border-white/10 pb-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white">FIELD OPERATIONS</h2>
          <p className="font-inter text-gray-400">Good {new Date().getHours() < 12 ? 'morning' : 'evening'}, {profile.name}</p>
        </div>
        {currentRound && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="font-bebas tracking-widest text-primary text-xl">LIVE: {currentRound.displayName}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Stats and Quick Actions */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-primary/10 border-primary/20 flex flex-col justify-between">
              <p className="text-xs font-inter text-primary-100 uppercase">Participants Checked In</p>
              <h3 className="text-3xl font-bebas text-white tracking-wider mt-2">
                {stats.checkedIn} <span className="text-gray-500 text-xl">/ {stats.expected}</span>
              </h3>
            </Card>
            <Card className="p-4 bg-white/5 flex flex-col justify-between">
              <p className="text-xs font-inter text-gray-400 uppercase">Teams Present</p>
              <h3 className="text-3xl font-bebas text-white tracking-wider mt-2">
                {stats.teamsTotal}
              </h3>
            </Card>
            <Card className="p-4 bg-white/5 flex flex-col justify-between">
              <p className="text-xs font-inter text-gray-400 uppercase">Current Round</p>
              <h3 className="text-xl font-bebas text-white tracking-wider mt-2 line-clamp-1">
                {currentRound ? currentRound.displayName : 'STANDBY'}
              </h3>
            </Card>
            <Card className="p-4 bg-white/5 flex flex-col justify-between">
              <p className="text-xs font-inter text-gray-400 uppercase">Classrooms Active</p>
              <h3 className="text-3xl font-bebas text-white tracking-wider mt-2">
                {activeClassroomsCount}
              </h3>
            </Card>
          </div>

          <div>
            <h3 className="font-bebas text-xl text-gray-400 mb-4 tracking-widest border-b border-white/10 pb-2">QUICK ACTIONS</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button 
                variant="primary" 
                className="h-24 text-xl font-bebas tracking-widest flex flex-col items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,51,51,0.2)]"
                onClick={() => navigate('/workspace/scanner')}
              >
                <ScanLine className="w-6 h-6" /> SCAN QR
              </Button>
              <Button 
                variant="outline" 
                className="h-24 text-lg font-bebas tracking-widest flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10"
                onClick={() => navigate('/workspace/participants')}
              >
                <Search className="w-6 h-6" /> FIND PARTICIPANT
              </Button>
              <Button 
                variant="outline" 
                className="h-24 text-lg font-bebas tracking-widest flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10"
                onClick={() => navigate('/workspace/teams')}
              >
                <Users className="w-6 h-6" /> FIND TEAM
              </Button>
              <Button 
                variant="outline" 
                className="h-24 text-lg font-bebas tracking-widest flex flex-col items-center justify-center gap-2 text-orange-400 border-orange-400/30 hover:bg-orange-400/10"
                onClick={() => navigate('/workspace/redemption')}
              >
                <Package className="w-6 h-6" /> REDEEM ADD-ON
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-bebas text-xl text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                <Clock className="w-5 h-5 text-primary" /> CURRENT OPERATIONS
              </h3>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <p className="text-gray-500 font-inter text-sm italic">No recent activity.</p>
                ) : (
                  recentActivity.map((act, i) => (
                    <div key={act.id} className="flex gap-4 items-start relative">
                      {i !== recentActivity.length - 1 && <div className="absolute left-3 top-8 bottom-[-16px] w-px bg-white/10"></div>}
                      <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex flex-shrink-0 items-center justify-center mt-0.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-gray-500 block mb-0.5">{new Date(act.timestamp).toLocaleTimeString()}</span>
                        <p className="font-inter text-sm text-gray-300">
                          {act.action.replace(/_/g, ' ')} 
                          {act.details && <span className="text-gray-500 block text-xs mt-0.5">{act.details}</span>}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-bebas text-xl text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                <Bell className="w-5 h-5 text-primary" /> ANNOUNCEMENTS
              </h3>
              <div className="space-y-4">
                {announcements.length === 0 ? (
                  <p className="text-gray-500 font-inter text-sm italic">No recent announcements.</p>
                ) : (
                  announcements.map((ann) => (
                    <div key={ann.id} className="flex flex-col gap-1 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bebas text-lg text-white">{ann.title}</h4>
                        <span className="text-[10px] text-gray-500 font-mono">{new Date(ann.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm font-inter text-gray-400 line-clamp-2">{ann.content}</p>
                    </div>
                  ))
                )}
                <Button variant="ghost" className="w-full text-xs" onClick={() => navigate('/workspace/announcements')}>
                  VIEW ALL ANNOUNCEMENTS <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Right Column - Context */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 bg-blue-900/10 border-blue-500/20">
            <h3 className="font-bebas text-xl text-blue-400 mb-4 tracking-widest border-b border-blue-500/20 pb-2">MY ASSIGNMENT</h3>
            <div className="space-y-4">
              {profile.assignedClassroom ? (
                <>
                  <div>
                    <span className="text-xs font-inter text-gray-500 block">Assigned Classroom</span>
                    <span className="font-bebas text-2xl text-white tracking-wide flex items-center gap-2 mt-1">
                      <MapPin className="w-5 h-5 text-blue-400" /> {profile.assignedClassroom}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-inter text-gray-500 block">Status</span>
                    <span className="font-inter text-sm text-green-400 font-medium flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-4 h-4" /> ACTIVE
                    </span>
                  </div>
                  <Button variant="outline" className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10" onClick={() => navigate('/workspace/assignment')}>
                    VIEW CLASSROOM
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="font-bebas text-xl text-gray-400">NO ACTIVE ASSIGNMENT</p>
                  <p className="text-sm text-gray-500 mt-1">You are currently available.</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 border-white/10">
            <h3 className="font-bebas text-xl text-white mb-4 tracking-widest border-b border-white/10 pb-2">CURRENT ROUND</h3>
            {currentRound ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-bebas text-2xl text-primary">{currentRound.displayName}</h4>
                  <p className="font-inter text-sm text-gray-400 capitalize">{currentRound.type || 'Standard'} Round</p>
                </div>
                <div className="pt-2">
                  <span className="text-xs font-inter text-gray-500 block mb-1">Status</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-mono border ${currentRound.status.includes('OPEN') ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-orange-500/10 text-orange-400 border-orange-500/30'}`}>
                    {currentRound.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {currentRound.submissionCloseAt && (
                  <div>
                    <span className="text-xs font-inter text-gray-500 block mb-1">Submission Deadline</span>
                    <span className="font-inter text-sm text-white">
                      {new Date(currentRound.submissionCloseAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No active round configured.</p>
            )}
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
