import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';

import { LayoutGrid, MapPin, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ParticipantService } from '../../services/ParticipantService';
import { ClassroomService } from '../../services/ClassroomService';
import { TeamService } from '../../services/TeamService';
import { SubmissionService } from '../../services/SubmissionService';

import type { Staff, Classroom, Team } from '../../types/models';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';

interface SeatingData {
  seatId: string;
  team?: Team;
  submissionStatus: 'pending' | 'submitted' | 'locked' | 'empty';
  evaluationStatus: 'pending' | 'draft' | 'completed' | 'empty';
}

export default function VolunteerClassroom() {
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<Staff | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [seating, setSeating] = useState<SeatingData[]>([]);
  const [loading, setLoading] = useState(true);

  const canEdit = profile?.customPermissions?.includes('classrooms.edit') || profile?.role === 'organizer';

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
            const promises = cr.seatingPlan.map(async (seat) => {
              if (!seat.teamId) {
                return { seatId: seat.seatId, submissionStatus: 'empty' as const, evaluationStatus: 'empty' as const };
              }
              
              const team = await TeamService.getTeam(seat.teamId);
              let submissionStatus: SeatingData['submissionStatus'] = 'pending';
              let evaluationStatus: SeatingData['evaluationStatus'] = 'pending';
              
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
                seatId: seat.seatId,
                team,
                submissionStatus,
                evaluationStatus
              };
            });
            
            const resolved = await Promise.all(promises);
            if (isMounted) {
              setSeating(resolved.sort((a, b) => a.seatId.localeCompare(b.seatId, undefined, { numeric: true })));
              setLoading(false);
            }
          } else {
            if (isMounted) setLoading(false);
          }
        });
      } else {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchInitial();
    
    return () => {
      isMounted = false;
      if (unsubClassroom) unsubClassroom();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
        </div>
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
          title="No Classroom Assigned"
          description="Contact an organizer to assign you to a classroom."
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <LayoutGrid className="w-8 h-8 text-primary" /> CLASSROOM STATUS
          </h2>
          <p className="font-inter text-gray-400">Live seating plan and tracking.</p>
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
                  {classroom.seatingPlan.filter(s => s.teamId).length} / {classroom.seatingPlan.length} TEAMS
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
        </div>

        <div className="lg:col-span-3">
          <Card className="p-0 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-white/5">
              {seating.map(seat => (
                <div key={seat.seatId} className="p-6 border-b border-white/5 relative group hover:bg-white/5 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-bebas text-2xl text-primary bg-primary/10 px-3 py-1 rounded">
                      {seat.seatId}
                    </span>
                    {seat.submissionStatus === 'empty' ? (
                      <Badge variant="outline">Empty</Badge>
                    ) : (
                      <Badge variant={seat.submissionStatus === 'locked' || seat.submissionStatus === 'submitted' ? 'success' : 'warning'}>
                        {seat.submissionStatus === 'locked' || seat.submissionStatus === 'submitted' ? 'Submitted' : 'Pending'}
                      </Badge>
                    )}
                  </div>
                  
                  {seat.team ? (
                    <div>
                      <h4 className="font-bebas text-xl text-white tracking-wide">{seat.team.name}</h4>
                      <p className="font-inter text-xs text-gray-400 mt-1 truncate">{seat.team.track}</p>
                    </div>
                  ) : (
                    <div className="py-4 text-center border border-dashed border-white/10 rounded">
                      <p className="font-inter text-sm text-gray-500">Available Seat</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
