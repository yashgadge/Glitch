import React, { useState, useEffect, useMemo } from 'react';
import { Users, GripVertical, CheckCircle2, Shield, Calendar, Search, MapPin, AlertCircle, XCircle } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/ToastContext';
import { ParticipantService } from '@shared/services/ParticipantService';
import { ClassroomService } from '@shared/services/ClassroomService';
import { AssignmentService } from '@shared/services/AssignmentService';
import type { Staff, Classroom } from '@shared/types/models';
import { useAuth } from '@shared/contexts/AuthContext';
import { Drawer } from '../../../components/ui/Drawer';
import JudgeAssignmentManager from './JudgeAssignmentManager';

export default function AssignmentCenter() {
  const { user } = useAuth();
  const { success, error } = useToast();
  
  const [staff, setStaff] = useState<Staff[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [activeTab, setActiveTab] = useState<'classrooms' | 'judges'>('classrooms');
  
  // Manual Assignment Drawer State
  const [selectedRoom, setSelectedRoom] = useState<Classroom | null>(null);

  useEffect(() => {
    const unsubStaff = ParticipantService.subscribeToAllStaff(setStaff);
    const unsubRooms = ClassroomService.subscribeToAllClassrooms((rooms) => {
      setClassrooms(rooms.sort((a,b) => a.id.localeCompare(b.id)));
    });

    return () => {
      unsubStaff();
      unsubRooms();
    };
  }, []);

  const handleAutoAssignCoordinators = async () => {
    setIsAssigning(true);
    try {
      const activeRooms = classrooms.filter(c => c.status !== 'offline' && c.status !== 'maintenance');
      const roomIds = activeRooms.map(r => r.id);
      
      if (roomIds.length === 0) {
        error('No active classrooms found.');
        return;
      }

      const result = await AssignmentService.autoAssignCoordinators(user!.uid, roomIds, 'coordinators_only', false);
      
      success(`Auto-assign complete. Assigned: ${result.assigned}, Conflicts: ${result.conflicts}, Unassigned: ${result.unassigned}`);
    } catch (err: any) {
      error(`Failed to auto-assign: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleManualAssign = async (staffId: string) => {
    if (!selectedRoom) return;
    try {
      if (selectedRoom.primaryCoordinator) {
        await AssignmentService.replaceClassCoordinator(user!.uid, selectedRoom.id, selectedRoom.primaryCoordinator, staffId, 'Manual Reassignment');
        success('Coordinator replaced successfully.');
      } else {
        await AssignmentService.assignClassCoordinator(user!.uid, staffId, selectedRoom.id);
        success('Coordinator assigned successfully.');
      }
      setSelectedRoom(null);
    } catch (err: any) {
      error(`Failed to assign: ${err.message}`);
    }
  };

  const handleRemoveAssignment = async () => {
    if (!selectedRoom || !selectedRoom.primaryCoordinator) return;
    try {
      await AssignmentService.removeClassCoordinator(user!.uid, selectedRoom.id, selectedRoom.primaryCoordinator, 'Admin Removal');
      success('Coordinator removed.');
      setSelectedRoom(null);
    } catch (err: any) {
      error(`Failed to remove: ${err.message}`);
    }
  };

  const getStaffByRole = (roleStr: string) => {
    return staff.filter(s => s.roles?.includes(roleStr as any) || s.role === roleStr);
  };

  const coordinators = getStaffByRole('class_coordinator');
  const availableCoordinators = coordinators.filter(s => s.availabilityStatus === 'AVAILABLE' || !s.availabilityStatus);
  const busyCoordinators = coordinators.filter(s => s.availabilityStatus === 'BUSY' || s.availabilityStatus === 'UNAVAILABLE');
  
  const getStaffName = (id: string) => staff.find(s => s.id === id)?.name || id;
  const getStaffDetails = (id: string) => staff.find(s => s.id === id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" /> ASSIGNMENT CENTER
          </h2>
          <p className="font-inter text-gray-400">Manage staff workload, assignments, and judge evaluations.</p>
        </div>
        <div className="flex bg-black/40 border border-white/10 rounded-lg p-1">
          <button 
            className={`px-4 py-2 font-bebas tracking-wider rounded text-sm transition-colors ${activeTab === 'classrooms' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('classrooms')}
          >
            CLASSROOMS & STAFF
          </button>
          <button 
            className={`px-4 py-2 font-bebas tracking-wider rounded text-sm transition-colors ${activeTab === 'judges' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('judges')}
          >
            JUDGE ASSIGNMENTS
          </button>
        </div>
      </div>

      {activeTab === 'classrooms' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Classrooms Coverage */}
        <Card className="p-6 flex flex-col h-full border-blue-500/20 bg-blue-500/5">
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <h3 className="font-bebas text-2xl text-blue-400 flex items-center gap-2">
              <MapPin className="w-5 h-5" /> CLASSROOMS
            </h3>
            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-mono">
              {classrooms.length} TOTAL
            </span>
          </div>
          
          <div className="flex-1 space-y-4 mb-6 max-h-[400px] overflow-y-auto">
            {classrooms.map(c => {
              const isCovered = !!c.primaryCoordinator;
              return (
                <div key={c.id} className="p-3 bg-black/40 rounded border border-white/5 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bebas text-xl text-white">{c.id}</span>
                    {isCovered ? (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/50">COVERED</Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 bg-yellow-500/10">NEEDS STAFF</Badge>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-mono text-xs text-gray-400 truncate w-32">
                      {isCovered ? getStaffName(c.primaryCoordinator!) : 'Unassigned'}
                    </span>
                    <Button size="sm" variant="secondary" onClick={() => setSelectedRoom(c)}>
                      MANAGE
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <Button 
            className="w-full mt-auto" 
            variant="default"
            disabled={isAssigning}
            onClick={handleAutoAssignCoordinators}
          >
            AUTO ASSIGN CLASSROOMS
          </Button>
        </Card>

        {/* Class Coordinators Pool */}
        <Card className="p-6 flex flex-col h-full border-white/10 bg-white/5">
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <h3 className="font-bebas text-2xl text-white flex items-center gap-2">
              <Shield className="w-5 h-5" /> COORDINATOR POOL
            </h3>
            <span className="bg-white/10 text-gray-300 px-2 py-1 rounded text-xs font-mono">
              {coordinators.length} TOTAL
            </span>
          </div>
          
          <div className="flex-1 space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-green-500/10 border border-green-500/20 p-2 rounded text-center">
                <span className="block text-2xl font-bebas text-green-400">{availableCoordinators.length}</span>
                <span className="text-[10px] text-green-400/70 font-mono tracking-widest">AVAILABLE</span>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-center">
                <span className="block text-2xl font-bebas text-yellow-400">{busyCoordinators.length}</span>
                <span className="text-[10px] text-yellow-400/70 font-mono tracking-widest">BUSY</span>
              </div>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {coordinators.map(s => {
                const isAvail = s.availabilityStatus === 'AVAILABLE' || !s.availabilityStatus;
                return (
                  <div key={s.id} className="flex justify-between items-center p-3 bg-black/40 rounded border border-white/5">
                    <span className="font-inter text-white text-sm truncate">{s.name}</span>
                    <span className={`font-mono text-[10px] px-2 py-1 rounded ${isAvail ? 'text-green-400 bg-green-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>
                      {isAvail ? 'AVAILABLE' : 'BUSY'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Judges */}
        <Card className="p-6 flex flex-col h-full border-purple-500/20 bg-purple-500/5">
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <h3 className="font-bebas text-2xl text-purple-400 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> JUDGES
            </h3>
            <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs font-mono">
              {getStaffByRole('judge').length} TOTAL
            </span>
          </div>
          
          <div className="flex-1 space-y-4 mb-6">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {getStaffByRole('judge').map(s => (
                <div key={s.id} className="flex justify-between items-center p-3 bg-black/40 rounded border border-white/5">
                  <span className="font-inter text-white text-sm">{s.name}</span>
                  {s.assignedClassroom ? (
                    <span className="font-mono text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> {s.assignedClassroom}</span>
                  ) : (
                    <span className="font-mono text-xs text-yellow-500 bg-yellow-500/20 px-2 py-1 rounded">UNASSIGNED</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Volunteers */}
        <Card className="p-6 flex flex-col h-full border-green-500/20 bg-green-500/5">
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <h3 className="font-bebas text-2xl text-green-400 flex items-center gap-2">
              <Users className="w-5 h-5" /> VOLUNTEERS
            </h3>
            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-mono">
              {getStaffByRole('volunteer').length} TOTAL
            </span>
          </div>
          
          <div className="flex-1 space-y-4 mb-6">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {getStaffByRole('volunteer').map(s => (
                <div key={s.id} className="flex justify-between items-center p-3 bg-black/40 rounded border border-white/5">
                  <span className="font-inter text-white text-sm">{s.name}</span>
                  {s.assignedClassroom ? (
                    <span className="font-mono text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> {s.assignedClassroom}</span>
                  ) : (
                    <span className="font-mono text-xs text-yellow-500 bg-yellow-500/20 px-2 py-1 rounded">UNASSIGNED</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
      ) : (
        <JudgeAssignmentManager />
      )}

      <Drawer
        isOpen={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
        title={`Manage ${selectedRoom?.id}`}
      >
        {selectedRoom && (
          <div className="space-y-6">
            <div className="p-4 bg-black/40 border border-white/10 rounded-lg">
              <h4 className="font-inter text-sm text-gray-400 mb-2">CURRENT COORDINATOR</h4>
              {selectedRoom.primaryCoordinator ? (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bebas text-xl">
                      {getStaffName(selectedRoom.primaryCoordinator).charAt(0)}
                    </div>
                    <div>
                      <span className="block font-inter text-white">{getStaffName(selectedRoom.primaryCoordinator)}</span>
                      <span className="block font-mono text-[10px] text-green-400">ACTIVE ASSIGNMENT</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRemoveAssignment} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                    <XCircle className="w-4 h-4 mr-2" /> REMOVE
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-500">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-inter text-sm">No coordinator assigned</span>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-inter text-sm text-gray-400 mb-3 uppercase">Recommended Replacements</h4>
              <div className="space-y-2">
                {availableCoordinators.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                    <div>
                      <span className="block font-inter text-sm text-white">{s.name}</span>
                      <span className="block font-mono text-[10px] text-green-400">Class Coordinator • Available</span>
                    </div>
                    <Button size="sm" onClick={() => handleManualAssign(s.id)}>ASSIGN</Button>
                  </div>
                ))}
                {availableCoordinators.length === 0 && (
                  <p className="text-sm font-inter text-gray-500">No available Class Coordinators.</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-inter text-sm text-gray-400 mb-3 uppercase">Fallback Options</h4>
              <div className="space-y-2">
                {getStaffByRole('volunteer').filter(s => s.availabilityStatus === 'AVAILABLE' || !s.availabilityStatus).slice(0, 5).map(s => (
                  <div key={s.id} className="flex justify-between items-center p-3 bg-white/5 border border-white/10 rounded-lg opacity-80 hover:opacity-100 transition-opacity">
                    <div>
                      <span className="block font-inter text-sm text-gray-300">{s.name}</span>
                      <span className="block font-mono text-[10px] text-blue-400">Volunteer • Available</span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => handleManualAssign(s.id)}>ASSIGN FALLBACK</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
