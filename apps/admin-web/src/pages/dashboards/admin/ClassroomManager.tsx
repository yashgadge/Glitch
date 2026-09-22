import React, { useState, useEffect } from 'react';
import { School, MapPin, Users, Info, Settings, Edit, Trash2, X, Plus } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@shared/lib/firebase';
import type { Classroom, Team } from '@shared/types/models';
import { Card, CardContent } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input, Label } from '../../../components/ui/Form';
import { Modal } from '../../../components/ui/Modal';
import { usePermissions } from '@shared/lib/permissions';
import { ClassroomService } from '@shared/services/ClassroomService';
import { useToast } from '../../../components/ui/ToastContext';
import { useAuth } from '@shared/contexts/AuthContext';

export default function ClassroomManager() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const { hasPermission } = usePermissions();
  const { success, error: toastError } = useToast();
  const { user } = useAuth();

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);

  // Create Classroom State
  const [newClassroom, setNewClassroom] = useState({
    id: '',
    building: '',
    floor: '',
    capacity: 30
  });

  const [capacity, setCapacity] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);
  const [assignTeamId, setAssignTeamId] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'classrooms'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Classroom));
      setClassrooms(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'teams'), where('status', 'not-in', ['eliminated', 'disqualified']));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedClassroom) {
      const updated = classrooms.find(c => c.id === selectedClassroom.id);
      if (updated) setSelectedClassroom(updated);
    }
  }, [classrooms, selectedClassroom]);

  const openSettings = (cr: Classroom) => {
    setSelectedClassroom(cr);
    setCapacity(cr.capacity || 30);
    setSettingsModalOpen(true);
    setAssignTeamId('');
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassroom.id) return;
    setIsProcessing(true);
    try {
      await ClassroomService.createClassroom(newClassroom.id.toUpperCase().trim(), {
        building: newClassroom.building,
        floor: newClassroom.floor,
        capacity: newClassroom.capacity
      });
      success('Classroom Created', 'New classroom has been successfully added.');
      setIsCreateModalOpen(false);
      setNewClassroom({ id: '', building: '', floor: '', capacity: 30 });
    } catch (err: any) {
      toastError('Creation Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateCapacity = async () => {
    if (!selectedClassroom) return;
    setIsProcessing(true);
    try {
      await ClassroomService.updateClassroom(selectedClassroom.id!, { capacity });
      success('Classroom Updated', 'Capacity updated successfully.');
    } catch (err: any) {
      toastError('Update Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteClassroom = async (roomId: string) => {
    if (!confirm(`Are you sure you want to delete classroom ${roomId}?`)) return;
    setIsProcessing(true);
    try {
      await ClassroomService.deleteClassroom(roomId);
      success('Classroom Deleted', 'The classroom has been removed.');
    } catch (err: any) {
      toastError('Deletion Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignTeam = async () => {
    if (!selectedClassroom || !assignTeamId || !user) return;
    setIsProcessing(true);
    try {
      await ClassroomService.assignTeamToClassroom(selectedClassroom.id!, assignTeamId, user.uid);
      success('Team Assigned', `Team ${assignTeamId} assigned to classroom.`);
      setAssignTeamId('');
    } catch (err: any) {
      toastError('Assignment Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!selectedClassroom || !user) return;
    setIsProcessing(true);
    try {
      await ClassroomService.removeTeamFromClassroom(selectedClassroom.id!, teamId, user.uid);
      success('Team Removed', 'The team was removed from the classroom.');
    } catch (err: any) {
      toastError('Removal Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const columns: Column<Classroom>[] = [
    {
      header: 'Room',
      accessorKey: 'roomName',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-bebas text-lg tracking-wide text-white">{row.roomName || row.id}</p>
          <p className="text-xs text-gray-500 font-inter">{row.building} • Floor {row.floor}</p>
        </div>
      )
    },
    {
      header: 'Capacity',
      accessorKey: 'capacity',
      sortable: true,
      cell: (row) => {
        const occupied = row.currentOccupancy || 0;
        return (
          <div className="flex items-center gap-2 text-gray-300 font-inter text-sm">
            <Users className="w-4 h-4 text-primary" /> {occupied} / {row.capacity}
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (row) => {
        if (row.status === 'AVAILABLE') return <Badge variant="success">Active</Badge>;
        if (row.status === 'MAINTENANCE') return <Badge variant="warning">Maintenance</Badge>;
        return <Badge variant="danger">{row.status}</Badge>;
      }
    },
    {
      header: 'Teams',
      accessorKey: 'teamIds',
      cell: (row) => (
        <div className="text-xs font-inter text-gray-400">
          {(row.teamIds || []).length} Teams
        </div>
      )
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (row) => (
        <div className="flex gap-2">
          {hasPermission('classrooms.manage') && (
            <>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openSettings(row)}><Settings className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300" onClick={() => handleDeleteClassroom(row.id!)}><Trash2 className="w-4 h-4" /></Button>
            </>
          )}
        </div>
      )
    }
  ];

  const handleAutoAssign = async () => {
    if (!confirm('Are you sure you want to auto-assign all PAID and unassigned teams to available classrooms?')) return;
    setIsProcessing(true);
    try {
      const result = await ClassroomService.autoAssignPaidTeams();
      success('Auto-Assign Complete', `Assigned ${result.assigned} teams. Failed/Skipped: ${result.failed}`);
    } catch (err: any) {
      toastError('Auto-Assign Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-3">
             <School className="w-8 h-8 text-primary" /> CLASSROOM MANAGER
          </h1>
          <p className="font-inter text-gray-400">Manage venue spaces, capacity, and assignments.</p>
        </div>
        <div className="flex gap-3">
          {hasPermission('classrooms.manage') && (
            <>
              <Button variant="outline" className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10" onClick={handleAutoAssign} isLoading={isProcessing}>
                Auto-Assign PAID Teams
              </Button>
              <Button variant="primary" leftIcon={MapPin} onClick={() => setIsCreateModalOpen(true)}>ADD CLASSROOM</Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable 
            data={classrooms} 
            columns={columns} 
            searchable 
            searchKey="roomName"
          />
        </CardContent>
      </Card>

      <Modal isOpen={settingsModalOpen} onClose={() => { setSettingsModalOpen(false); setSelectedClassroom(null); }} title="Classroom Assignment & Settings" size="4xl">
        {selectedClassroom && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <Label>Update Capacity</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="number" value={capacity} onChange={e => setCapacity(Number(e.target.value))} className="w-32" />
                  <Button variant="outline" onClick={handleUpdateCapacity} isLoading={isProcessing}>Update</Button>
                </div>
              </div>
              <div>
                <Label>Assign New Team</Label>
                <div className="flex gap-2 mt-1">
                  <select
                    value={assignTeamId}
                    onChange={e => setAssignTeamId(e.target.value)}
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50 font-inter text-sm"
                  >
                    <option value="">-- Select a Team --</option>
                    {teams.filter(t => t.assignedRoom !== selectedClassroom.id).map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                    ))}
                  </select>
                  <Button variant="primary" leftIcon={Plus} onClick={handleAssignTeam} disabled={!assignTeamId} isLoading={isProcessing}>Assign</Button>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <h3 className="font-bebas text-2xl text-white mb-4 tracking-wider">Assigned Teams</h3>
              
              {(!selectedClassroom.teamIds || selectedClassroom.teamIds.length === 0) ? (
                <div className="text-gray-500 font-inter text-sm bg-white/5 rounded-lg p-6 text-center border border-dashed border-white/10">
                  No teams are assigned to this classroom.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedClassroom.teamIds.map(teamId => {
                    const team = teams.find(t => t.id === teamId);
                    return (
                      <div key={teamId} className="bg-white/5 border border-white/10 p-4 rounded-lg flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bebas text-xl text-white truncate pr-4" title={team?.name || 'Unknown'}>{team?.name || 'Unknown Team'}</h4>
                            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{teamId}</span>
                          </div>
                          <p className="text-sm font-inter text-gray-400 mb-1">{team?.track || 'N/A'}</p>
                          <p className="text-xs font-inter text-gray-500 flex items-center gap-1">
                            <Users className="w-3 h-3" /> {(team?.memberIds || []).length} Members
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                          <Button variant="outline" size="sm" className="text-red-400 border-red-500/20 hover:bg-red-500/10 h-8" onClick={() => handleRemoveTeam(teamId)} isLoading={isProcessing}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Classroom" size="lg">
        <form onSubmit={handleCreateClassroom} className="space-y-4">
          <div>
            <Label>Room ID / Number</Label>
            <Input required value={newClassroom.id} onChange={e => setNewClassroom({...newClassroom, id: e.target.value})} placeholder="e.g. A201" />
          </div>
          <div>
            <Label>Building</Label>
            <Input required value={newClassroom.building} onChange={e => setNewClassroom({...newClassroom, building: e.target.value})} placeholder="e.g. Main Block" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Floor</Label>
              <Input required value={newClassroom.floor} onChange={e => setNewClassroom({...newClassroom, floor: e.target.value})} placeholder="e.g. 2" />
            </div>
            <div>
              <Label>Max Capacity</Label>
              <Input required type="number" min="1" value={newClassroom.capacity} onChange={e => setNewClassroom({...newClassroom, capacity: Number(e.target.value)})} />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" variant="primary" isLoading={isProcessing}>Create Classroom</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
