import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { MapPin, Shield, Users, Clock, CheckCircle2, UserCircle2 } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { ParticipantService } from '@shared/services/ParticipantService';
import { ClassroomService } from '@shared/services/ClassroomService';
import { TeamService } from '@shared/services/TeamService';
import { SubmissionService } from '@shared/services/SubmissionService';
import { AssignmentService } from '@shared/services/AssignmentService';
import type { Staff, Classroom, Team } from '@shared/types/models';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamData {
  team: Team;
  submissionStatus: 'pending' | 'submitted' | 'locked' | 'empty';
  evaluationStatus: 'pending' | 'draft' | 'completed' | 'empty';
}

export default function VolunteerAssignment() {
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<Staff | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const { success, error } = useToast();

  const canEdit = profile?.customPermissions?.includes('classrooms.edit') || profile?.role === 'organizer' || profile?.role === 'class_coordinator';

  useEffect(() => {
    if (!user) return;
    
    let unsubClassroom: () => void;
    let isMounted = true;
    
    const fetchInitial = async () => {
      const staff = await ParticipantService.getStaffProfile(user.uid);
      if (isMounted) setProfile(staff);
      
      if (staff?.assignedClassroom) {
        unsubClassroom = ClassroomService.subscribeToClassroom(staff.assignedClassroom, async (cr) => {
          if (isMounted) setClassroom(cr);
          
          if (cr) {
            const validTeamIds = cr.teamIds || [];
            const promises = validTeamIds.map(async (teamId) => {
              const team = await TeamService.getTeam(teamId);
              let submissionStatus: TeamData['submissionStatus'] = 'pending';
              let evaluationStatus: TeamData['evaluationStatus'] = 'pending';
              
              if (team) {
                const sub = await new Promise<any>((resolve) => {
                  const unsub = SubmissionService.subscribeToTeamSubmission(team.id, (data) => {
                    unsub();
                    resolve(data);
                  });
                });
                
                if (sub) {
                  submissionStatus = sub.status;
                }
              }
              
              return {
                team: team!,
                submissionStatus,
                evaluationStatus
              };
            });
            
            const resolved = (await Promise.all(promises)).filter(r => r.team);
            if (isMounted) {
              setTeams(resolved.sort((a, b) => a.team.name.localeCompare(b.team.name)));
              setLoading(false);
            }
          } else {
            if (isMounted) setLoading(false);
          }
        });
      } else {
        if (isMounted) setLoading(false);
      }
      
      TeamService.subscribeToAllTeams((tms) => {
        if (isMounted) {
          setAvailableTeams(tms.filter(t => !t.eliminated && !t.disqualified && !t.assignedRoom));
        }
      });
    };
    
    fetchInitial();
    
    return () => {
      isMounted = false;
      if (unsubClassroom) unsubClassroom();
    };
  }, [user]);

  const handleAssignTeam = async (teamId: string) => {
    if (!classroom || !canEdit || !user) return;
    try {
      await ClassroomService.assignTeamToClassroom(classroom.id!, teamId, user.uid);
      success(`Team assigned successfully`);
    } catch (err: any) {
      error(err.message || 'Failed to assign team');
    }
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!classroom || !canEdit || !user) return;
    if (!window.confirm(`Are you sure you want to unassign this team?`)) return;
    try {
      await ClassroomService.removeTeamFromClassroom(classroom.id!, teamId, user.uid);
      success(`Team removed successfully`);
    } catch (err: any) {
      error(err.message || 'Failed to remove team');
    }
  };

  const toggleAvailability = async () => {
    if (!profile) return;
    setUpdatingAvailability(true);
    try {
      const newStatus = profile.availabilityStatus === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
      await AssignmentService.markStaffAvailability(profile.id, newStatus, 'Toggled from Classroom dashboard');
      setProfile({ ...profile, availabilityStatus: newStatus });
      success(`Status marked as ${newStatus}`);
    } catch (err: any) {
      error('Failed to update availability');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
          <div className="lg:col-span-3">
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile?.assignedClassroom || !classroom) {
    return (
      <div className="max-w-3xl mx-auto pt-20">
        <EmptyState 
          icon={MapPin}
          title="NO ACTIVE ASSIGNMENT"
          description="You do not have a specific classroom assigned for this shift. Please stand by or check with an organizer."
        />
        <div className="mt-6 text-center flex justify-center">
          <Card className="p-6 max-w-sm w-full bg-black/40 border border-white/10 text-left">
            <h3 className="font-bebas text-xl text-white mb-4 border-b border-white/10 pb-2">AVAILABILITY STATUS</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${profile?.availabilityStatus === 'AVAILABLE' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                <span className="font-mono text-sm text-gray-300">{profile?.availabilityStatus || 'OFFLINE'}</span>
              </div>
              <Button size="sm" variant={profile?.availabilityStatus === 'AVAILABLE' ? 'outline' : 'primary'} onClick={toggleAvailability} disabled={updatingAvailability}>
                {updatingAvailability ? 'UPDATING...' : (profile?.availabilityStatus === 'AVAILABLE' ? 'GO OFFLINE' : 'GO ONLINE')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" /> CLASSROOM STATUS
          </h2>
          <p className="font-inter text-gray-400">Live operational assignments and tracking.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-6 bg-primary/10 border-primary/20">
            <h3 className="font-bebas text-3xl text-white tracking-widest">{classroom.id}</h3>
            <p className="font-inter text-primary-100 text-sm mt-1">{classroom.building}, Floor {classroom.floor}</p>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-inter text-gray-500 uppercase">ROUND</span>
                <p className="text-xl font-bebas text-white tracking-wider mt-1">{classroom.currentRound}</p>
              </div>
              <div>
                <span className="text-xs font-inter text-gray-500 uppercase">OCCUPANCY</span>
                <p className="text-xl font-bebas text-white tracking-wider mt-1">
                  <span className="text-white font-mono">{classroom.currentOccupancy || 0} / {classroom.capacity}</span>
                </p>
              </div>
              <div className="pt-4 border-t border-white/5">
                <span className="text-xs font-inter text-gray-500 uppercase">ACCESS LEVEL</span>
                <div className="flex items-center gap-2 mt-1">
                  <Shield className={`w-4 h-4 ${canEdit ? 'text-green-500' : 'text-yellow-500'}`} />
                  <span className={`font-mono text-xs ${canEdit ? 'text-green-400' : 'text-yellow-400'}`}>
                    {canEdit ? 'WRITE ACCESS' : 'READ ONLY'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-black/40 border border-white/10 text-left">
            <h3 className="font-bebas text-xl text-white mb-4 border-b border-white/10 pb-2">MY AVAILABILITY</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${profile?.availabilityStatus === 'AVAILABLE' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                <span className="font-mono text-sm text-gray-300">{profile?.availabilityStatus || 'OFFLINE'}</span>
              </div>
              <Button size="sm" variant="outline" onClick={toggleAvailability} disabled={updatingAvailability}>
                {profile?.availabilityStatus === 'AVAILABLE' ? 'GO ON BREAK' : 'SET AVAILABLE'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <Card className="p-6 border-white/5 bg-black/30">
            <h3 className="font-bebas text-2xl text-white mb-6">ASSIGNED TEAMS</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {teams.map((t, idx) => (
                  <motion.div 
                    key={t.team.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 bg-white/5 border border-white/10 rounded-xl relative group flex flex-col justify-between min-h-[140px]"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">{t.team.id}</span>
                        {t.submissionStatus === 'locked' || t.submissionStatus === 'submitted' ? (
                          <Badge variant="success">Submitted</Badge>
                        ) : (
                          <Badge variant="warning">Pending</Badge>
                        )}
                      </div>
                      <h4 className="font-bebas text-2xl text-white tracking-wide truncate">{t.team.name}</h4>
                      <p className="font-inter text-sm text-gray-400 mt-1 truncate">{t.team.track}</p>
                    </div>

                    {canEdit && (
                      <div className="mt-4 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                        <Button variant="outline" size="sm" className="text-red-400 border-red-500/20 hover:bg-red-500/10 h-8" onClick={() => handleRemoveTeam(t.team.id)}>
                          UNASSIGN
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {teams.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-xl">
                <Users className="w-12 h-12 mb-4 opacity-50" />
                <p className="font-inter">No teams are currently assigned to this classroom.</p>
              </div>
            )}
            
            {canEdit && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <h4 className="font-bebas text-lg text-white mb-3">ASSIGN NEW TEAM</h4>
                <div className="flex gap-3">
                  <select 
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white font-inter text-sm focus:outline-none focus:border-primary"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAssignTeam(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Select a team to assign...</option>
                    {availableTeams.length === 0 && <option disabled>No unassigned active teams available</option>}
                    {availableTeams.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.track})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
