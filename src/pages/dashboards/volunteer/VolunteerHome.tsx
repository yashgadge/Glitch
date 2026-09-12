import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { School, ScanLine, Search, LayoutGrid, Clock, MapPin } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { ParticipantService } from '../../../services/ParticipantService';
import { ClassroomService } from '../../../services/ClassroomService';
import type { Staff, Classroom } from '../../../types/models';

export default function VolunteerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Staff | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchInitial = async () => {
      const staff = await ParticipantService.getStaffProfile(user.uid);
      setProfile(staff);
      
      if (staff?.assignedClassroom) {
        const unsubClassroom = ClassroomService.subscribeToClassroom(staff.assignedClassroom, (cr) => {
          setClassroom(cr);
        });
        return () => unsubClassroom();
      }
    };
    
    fetchInitial();
  }, [user]);

  if (!profile) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white">VOLUNTEER DASHBOARD</h2>
          <p className="font-inter text-gray-400">Welcome, {profile.name}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-primary/10 border-primary/20">
          <div className="flex items-center gap-4 mb-2">
            <School className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm font-inter text-primary-100">Assigned Room</p>
              <h3 className="text-3xl font-bebas text-white tracking-wider">
                {profile.assignedClassroom || 'UNASSIGNED'}
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-400 font-inter mt-4">
            {classroom ? `${classroom.building}, Floor ${classroom.floor}` : 'Contact organizer'}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-2">
            <Clock className="w-8 h-8 text-white" />
            <div>
              <p className="text-sm font-inter text-gray-400">Current Shift</p>
              <h3 className="text-2xl font-bebas text-white tracking-wider mt-1">
                {profile.metadata?.shift || 'ALL DAY'}
              </h3>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-2">
            <MapPin className="w-8 h-8 text-white" />
            <div>
              <p className="text-sm font-inter text-gray-400">Current Zone</p>
              <h3 className="text-2xl font-bebas text-white tracking-wider mt-1">
                {profile.metadata?.zone || (classroom ? classroom.building : 'UNASSIGNED')}
              </h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-inter text-yellow-500">Pending Tasks</p>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <h3 className="text-4xl font-bebas text-white tracking-wider">0</h3>
          <p className="text-xs text-yellow-500/80 font-inter mt-2">All caught up</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <Button 
          variant="primary" 
          className="h-32 text-xl font-bebas tracking-widest flex flex-col items-center justify-center gap-3"
          onClick={() => navigate('/workspace/scanner')}
        >
          <ScanLine className="w-8 h-8" /> OPEN SCANNER
        </Button>
        <Button 
          variant="outline" 
          className="h-32 text-xl font-bebas tracking-widest flex flex-col items-center justify-center gap-3 bg-white/5"
          onClick={() => navigate('/workspace/search')}
        >
          <Search className="w-8 h-8" /> SEARCH PARTICIPANT
        </Button>
        <Button 
          variant="outline" 
          className="h-32 text-xl font-bebas tracking-widest flex flex-col items-center justify-center gap-3 bg-white/5"
          onClick={() => navigate('/workspace/classroom')}
        >
          <LayoutGrid className="w-8 h-8" /> OPEN CLASSROOM
        </Button>
      </div>
    </div>
  );
}
