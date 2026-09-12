import React, { useState, useEffect } from 'react';
import { useAuth } from '@shared/contexts/AuthContext';
import { ParticipantService } from '@shared/services/ParticipantService';
import { ClassroomService } from '@shared/services/ClassroomService';
import { TeamService } from '@shared/services/TeamService';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { MapPin, Users, CheckCircle2, MonitorPlay, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { Staff, Classroom, Team } from '@shared/types/models';
import { useToast } from '../../../components/ui/ToastContext';
import { TeamDetailsModal } from '../../../components/admin/TeamDetailsModal';

export default function CoordinatorHome() {
  const { user } = useAuth();
  const { success, error } = useToast();
  
  const [profile, setProfile] = useState<Staff | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    let unsubRoom: () => void;
    let unsubTeams: () => void;

    const unsubProfile = ParticipantService.subscribeToStaff(user.uid, (p) => {
      setProfile(p);
      
      if (p?.assignedClassroom) {
        // Subscribe to classroom if not already
        unsubRoom = ClassroomService.subscribeToClassroom(p.assignedClassroom, (room) => {
          setClassroom(room);
        });
        
        // Subscribe to teams in this classroom
        unsubTeams = TeamService.subscribeToAllTeams((allTeams) => {
          const roomTeams = allTeams.filter(t => t.assignedClassroom === p.assignedClassroom);
          setTeams(roomTeams);
          setLoading(false);
        });
      } else {
        setClassroom(null);
        setTeams([]);
        setLoading(false);
      }
    });
    
    return () => {
      unsubProfile();
      if (unsubRoom) unsubRoom();
      if (unsubTeams) unsubTeams();
    };
  }, [user]);

  const handleMarkArrival = async (teamId: string) => {
    try {
      await TeamService.updateTeamStatus(teamId, 'arrived');
      success('Team marked as arrived.');
    } catch (err) {
      error('Failed to update team status.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (profile?.availabilityStatus === 'UNAVAILABLE') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-500" /> UNAVAILABLE
          </h2>
          <p className="font-inter text-gray-400">You are currently marked as unavailable for assignments.</p>
        </div>
        <Card className="p-8 border-red-500/20 bg-red-500/5 text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bebas text-red-400">NOT ELIGIBLE FOR ASSIGNMENT</h3>
          <p className="text-gray-400 font-inter text-sm mt-2">
            {profile.availabilityReason ? `Reason: ${profile.availabilityReason}` : 'Please contact the organizer if this is a mistake.'}
          </p>
        </Card>
      </div>
    );
  }

  if (!profile?.assignedClassroom) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <MapPin className="w-8 h-8 text-yellow-500" /> UNASSIGNED
          </h2>
          <p className="font-inter text-gray-400">You have not been assigned to a classroom yet.</p>
        </div>
        <Card className="p-8 border-yellow-500/20 bg-yellow-500/5 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-xl font-bebas text-yellow-400">WAITING FOR ASSIGNMENT</h3>
          <p className="text-gray-400 font-inter text-sm mt-2">Please wait for the lead organizer to assign you to a classroom.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <MapPin className="w-8 h-8 text-primary" /> CLASSROOM {classroom?.name || profile.assignedClassroom}
          </h2>
          <p className="font-inter text-gray-400">Manage team arrivals and presentations for your assigned room.</p>
        </div>
        <Badge variant={classroom?.status === 'active' ? 'success' : 'outline'}>
          {classroom?.status?.toUpperCase() || 'UNKNOWN'}
        </Badge>
      </div>

      {profile.availabilityStatus === 'BUSY' && profile.availabilityReason && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-3 text-yellow-400">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-inter text-sm">Note: You have been marked busy. Reason: {profile.availabilityReason}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4 border-l-4 border-l-primary/50">
          <p className="text-sm text-gray-400 font-inter">Assigned Teams</p>
          <p className="text-3xl font-bebas text-white mt-1">{teams.length}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500">
          <p className="text-sm text-gray-400 font-inter">Arrived</p>
          <p className="text-3xl font-bebas text-green-400 mt-1">{teams.filter(t => t.status === 'arrived').length}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-400 font-inter">Track</p>
          <p className="text-3xl font-bebas text-blue-400 mt-1">{classroom?.track || 'General'}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-black/20">
          <h3 className="font-bebas text-xl text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> TEAM ROSTER & ARRIVAL
          </h3>
        </div>
        <div className="divide-y divide-white/5">
          {teams.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-inter">
              No teams assigned to this classroom yet.
            </div>
          ) : (
            teams.map(team => (
              <div 
                key={team.id} 
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => setSelectedTeam(team)}
              >
                <div>
                  <h4 className="font-inter text-white font-medium">{team.name}</h4>
                  <p className="font-mono text-xs text-gray-400 mt-1">ID: {team.id} | Members: {team.memberIds?.length || 0}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge variant={team.status === 'arrived' ? 'success' : 'outline'}>
                    {team.status === 'arrived' ? 'ARRIVED' : 'PENDING'}
                  </Badge>
                  
                  {team.status !== 'arrived' && (
                    <Button size="sm" onClick={() => handleMarkArrival(team.id)}>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Arrived
                    </Button>
                  )}
                  
                  <Button size="sm" variant="outline" className="text-blue-400 border-blue-400/20 hover:bg-blue-400/10" onClick={(e) => { e.stopPropagation(); /* TODO: Implement start presentation */ }}>
                    <MonitorPlay className="w-4 h-4 mr-2" /> Start Presentation
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <TeamDetailsModal 
        isOpen={!!selectedTeam} 
        onClose={() => setSelectedTeam(null)} 
        team={selectedTeam} 
      />
    </div>
  );
}
