import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Search, Users, LayoutGrid, AlertTriangle, ShieldAlert, Package, Trophy, CheckCircle, Clock, Video, UserX } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { TeamService } from '@shared/services/TeamService';
import { ParticipantService } from '@shared/services/ParticipantService';
import { ClassroomService } from '@shared/services/ClassroomService';
import { EntitlementService } from '@shared/services/EntitlementService';
import type { Team, Staff, Classroom, Participant, Entitlement } from '@shared/types/models';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/ToastContext';
import { Modal } from '../../../components/ui/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { TeamDetailsModal } from '../../../components/admin/TeamDetailsModal';

export default function VolunteerTeams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();
  
  const [profile, setProfile] = useState<Staff | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leaders, setLeaders] = useState<Record<string, Participant>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [showAllTeams, setShowAllTeams] = useState<boolean>(false);

  const canManageTeams = profile?.customPermissions?.includes('teams.manage') || profile?.role === 'organizer';

  useEffect(() => {
    if (!user) return;
    
    let unsubClassroom: () => void;
    let unsubTeams: () => void;
    let unsubParts: () => void;

    const fetchInitial = async () => {
      const staff = await ParticipantService.getStaffProfile(user.uid);
      setProfile(staff);
      
      if (staff?.assignedClassroom) {
        unsubClassroom = ClassroomService.subscribeToClassroom(staff.assignedClassroom, (cr) => {
          setClassroom(cr);
        });
      }

      unsubTeams = TeamService.subscribeToAllTeams((tms) => {
        setTeams(tms);
        setLoading(false);
      });

      unsubParts = ParticipantService.subscribeToAllParticipants((pts) => {
        const leaderMap = pts.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, Participant>);
        setLeaders(leaderMap);
      });
    };
    
    fetchInitial();
    
    return () => {
      if (unsubClassroom) unsubClassroom();
      if (unsubTeams) unsubTeams();
      if (unsubParts) unsubParts();
    };
  }, [user]);

  // Removed redundant specific entitlement fetching since the modal handles the high-level team logic now.
  // We can add entitlement fetching directly into TeamDetailsModal later if needed.

  const filteredTeams = useMemo(() => {
    let filtered = teams;
    if (classroom && !showAllTeams && !search) {
      filtered = filtered.filter(t => t.assignedRoom === classroom.id);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = teams.filter(t => 
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.track.toLowerCase().includes(q)
      );
    }

    return filtered.sort((a, b) => {
      if (a.eliminated && !b.eliminated) return 1;
      if (!a.eliminated && b.eliminated) return -1;
      return a.name.localeCompare(b.name);
    });
  }, [teams, classroom, search]);

  const handleUpdatePresentation = async (teamId: string, status: any) => {
    if (!user) return;
    try {
      await TeamService.updatePresentationStatus(teamId, status, user.uid);
      success(`Presentation status updated to ${status}`);
    } catch (err: any) {
      error(err.message || 'Failed to update presentation status');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" /> TEAMS SEARCH
          </h2>
          <p className="font-inter text-gray-400">Locate teams and view their operational status.</p>
        </div>
        
        <div className="relative w-full md:w-96 flex flex-col sm:flex-row gap-2">
          {classroom && (
            <Button 
              variant="outline" 
              className="whitespace-nowrap"
              onClick={() => setShowAllTeams(!showAllTeams)}
            >
              {showAllTeams ? 'SHOW MY CLASSROOM' : 'SHOW ALL TEAMS'}
            </Button>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search teams by name, ID, track..."
              className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white font-inter text-sm focus:outline-none focus:border-primary transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {!canManageTeams && (
        <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 flex items-center gap-3 text-yellow-400 font-inter text-sm">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>You have read-only access to team management.</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : filteredTeams.length === 0 ? (
        <EmptyState 
          icon={Users}
          title="NO TEAMS FOUND"
          description={search ? "Try adjusting your search criteria." : "No teams are assigned to this classroom yet."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTeams.map((team, idx) => {
            const leaderName = team.leaderId ? leaders[team.leaderId]?.name || 'Unknown Leader' : 'No Leader';
            
            return (
              <motion.div 
                key={team.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card 
                  className={`p-0 overflow-hidden flex flex-col h-full border hover:border-primary/50 transition-colors cursor-pointer ${team.eliminated || team.disqualified ? 'border-red-500/20 bg-red-500/5' : 'border-white/5 bg-black/20'}`}
                  onClick={() => setSelectedTeam(team)}
                >
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bebas text-2xl text-white truncate max-w-[200px]">{team.name}</h3>
                      <Badge variant="outline" className="font-mono text-[10px]">R{team.currentRound}</Badge>
                    </div>
                    <div className="text-sm font-inter text-gray-400 mb-4 flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" /> Room: {team.assignedRoom || 'Unassigned'} | Seat: {team.assignedSeat || '-'}
                    </div>
                    
                    <div className="space-y-2 text-xs font-inter">
                      <div className="flex justify-between text-gray-500">
                        <span>Track:</span>
                        <span className="text-gray-300 font-mono">{team.track}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Leader:</span>
                        <span className="text-gray-300 truncate max-w-[120px]">{leaderName}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Status:</span>
                        {team.disqualified ? (
                          <span className="text-red-500 font-bebas tracking-wider">DISQUALIFIED</span>
                        ) : team.eliminated ? (
                          <span className="text-red-400 font-bebas tracking-wider">ELIMINATED</span>
                        ) : (
                          <span className="text-green-500 font-bebas tracking-wider">ACTIVE</span>
                        )}
                      </div>
                      <div className="flex justify-between text-gray-500 mt-1">
                        <span>Presentation:</span>
                        {team.presentationStatus ? (
                          <span className="text-blue-400 font-bebas tracking-wider">{team.presentationStatus}</span>
                        ) : (
                          <span className="text-gray-500 font-bebas tracking-wider">PENDING</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <TeamDetailsModal
        isOpen={!!selectedTeam}
        onClose={() => setSelectedTeam(null)}
        team={selectedTeam}
      />
    </div>
  );
}
