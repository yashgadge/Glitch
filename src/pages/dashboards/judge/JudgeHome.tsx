import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Users, School, CheckSquare, Bell, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { ParticipantService } from '../../../services/ParticipantService';
import { EventConfigService } from '../../../services/EventConfigService';
import { TeamService } from '../../../services/TeamService';
import { EvaluationService } from '../../../services/EvaluationService';
import { ClassroomService } from '../../../services/ClassroomService';
import type { Staff, Team, EventConfig, Classroom } from '../../../types/models';

export default function JudgeHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Staff | null>(null);
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    const fetchInitial = async () => {
      const staff = await ParticipantService.getStaffProfile(user.uid);
      setProfile(staff);
      
      if (staff?.assignedClassroom) {
        const unsubClassroom = ClassroomService.subscribeToClassroom(staff.assignedClassroom, async (cr) => {
          setClassroom(cr);
          if (cr) {
            const activeTeams = cr.seatingPlan.map(s => s.teamId).filter(Boolean) as string[];
            if (activeTeams.length > 0) {
              const fetchedTeams = await Promise.all(activeTeams.map(id => TeamService.getTeam(id)));
              const validTeams = fetchedTeams.filter(Boolean) as Team[];
              setTeams(validTeams);
              
              // Count completed evaluations for this judge
              let completed = 0;
              for (const team of validTeams) {
                const evalData = await EvaluationService.getJudgeEvaluation(user.uid, team.id, cr.currentRound);
                if (evalData && (evalData.status === 'submitted' || evalData.status === 'locked')) {
                  completed++;
                }
              }
              setCompletedCount(completed);
            }
          }
        });
        return () => unsubClassroom();
      }
    };
    
    fetchInitial();
    
    const unsubConfig = EventConfigService.subscribeToConfig(setConfig);
    
    return () => {
      unsubConfig();
    };
  }, [user]);

  if (!profile) return null;

  const pendingCount = teams.length - completedCount;
  const progressPercent = teams.length > 0 ? Math.round((completedCount / teams.length) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white">JUDGE DASHBOARD</h2>
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
            <CheckSquare className="w-8 h-8 text-white" />
            <div>
              <p className="text-sm font-inter text-gray-400">Current Round</p>
              <h3 className="text-3xl font-bebas text-white tracking-wider">
                {classroom?.currentRound ? `ROUND ${classroom.currentRound}` : 'WAITING'}
              </h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-inter text-yellow-500">Pending Teams</p>
            <Users className="w-5 h-5 text-yellow-500" />
          </div>
          <h3 className="text-4xl font-bebas text-white tracking-wider">{pendingCount}</h3>
        </Card>

        <Card className="p-6 border-green-500/20 bg-green-500/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-inter text-green-500">Completed Teams</p>
            <CheckSquare className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="text-4xl font-bebas text-white tracking-wider">{completedCount}</h3>
        </Card>
      </div>

      {teams.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bebas text-white mb-4">ROOM PROGRESS</h3>
          <div className="w-full bg-white/5 rounded-full h-4 mb-2 overflow-hidden border border-white/10">
            <div 
              className="bg-primary h-4 transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 font-mono">
            <span>0%</span>
            <span className="text-primary">{progressPercent}%</span>
            <span>100%</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button 
          variant="primary" 
          className="h-24 text-xl font-bebas tracking-widest flex items-center justify-center gap-3"
          onClick={() => navigate('/workspace/teams')}
        >
          <Users className="w-6 h-6" /> OPEN TEAM LIST <ArrowRight className="w-6 h-6" />
        </Button>
        <Button 
          variant="outline" 
          className="h-24 text-xl font-bebas tracking-widest flex items-center justify-center gap-3"
          onClick={() => navigate('/workspace/announcements')}
        >
          <Bell className="w-6 h-6" /> VIEW ANNOUNCEMENTS
        </Button>
      </div>
    </div>
  );
}
