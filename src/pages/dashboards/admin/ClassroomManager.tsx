import React, { useState, useEffect } from 'react';
import { School, MapPin, Users, Info, Settings, Edit, Trash2, LayoutGrid, RotateCcw, X, Check } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { Classroom, Team } from '../../../types/models';
import { Card, CardContent } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input, Label } from '../../../components/ui/Form';
import { Modal } from '../../../components/ui/Modal';
import { usePermissions } from '../../../lib/permissions';
import { ClassroomService } from '../../../services/ClassroomService';
import { useToast } from '../../../components/ui/ToastContext';

export default function ClassroomManager() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const { hasPermission } = usePermissions();
  const { success, error: toastError } = useToast();

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);

  // Seat Configuration State
  const [rows, setRows] = useState(5);
  const [columnsState, setColumnsState] = useState(6);
  const [capacity, setCapacity] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);

  // Seat Action State
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [assignTeamId, setAssignTeamId] = useState('');
  const [swapMode, setSwapMode] = useState(false);
  const [seatToSwap, setSeatToSwap] = useState<string | null>(null);

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

  // Update local state when selectedClassroom changes via snapshot
  useEffect(() => {
    if (selectedClassroom) {
      const updated = classrooms.find(c => c.id === selectedClassroom.id);
      if (updated) setSelectedClassroom(updated);
    }
  }, [classrooms, selectedClassroom]);

  const openSettings = (cr: Classroom) => {
    setSelectedClassroom(cr);
    setRows(cr.rows || 5);
    setColumnsState(cr.columns || 6);
    setCapacity(cr.capacity || 30);
    setSettingsModalOpen(true);
    setSelectedSeat(null);
    setSwapMode(false);
    setSeatToSwap(null);
  };

  const handleGenerateSeats = async () => {
    if (!selectedClassroom) return;
    setIsProcessing(true);
    try {
      await ClassroomService.generateSeats(selectedClassroom.id, rows, columnsState);
      success('Seats Generated', 'The seating plan has been automatically generated.');
    } catch (err: any) {
      toastError('Generation Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetSeats = async () => {
    if (!selectedClassroom) return;
    setIsProcessing(true);
    try {
      await ClassroomService.resetSeats(selectedClassroom.id);
      success('Seats Reset', 'All teams have been removed from their seats.');
    } catch (err: any) {
      toastError('Reset Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAutoAssign = async () => {
    if (!selectedClassroom) return;
    const unassignedTeams = teams.filter(t => !t.assignedSeat && t.assignedRoom !== selectedClassroom.id).map(t => t.id);
    if (unassignedTeams.length === 0) return toastError('No Teams', 'There are no unassigned active teams to place.');
    
    setIsProcessing(true);
    try {
      await ClassroomService.bulkAutoAssign(selectedClassroom.id, unassignedTeams);
      success('Auto Assign Complete', 'Empty seats were filled with unassigned teams.');
    } catch (err: any) {
      toastError('Auto Assign Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSeatClick = async (seatId: string) => {
    if (swapMode && seatToSwap) {
      // Execute swap
      if (seatId === seatToSwap) {
        setSwapMode(false);
        setSeatToSwap(null);
        return;
      }
      setIsProcessing(true);
      try {
        await ClassroomService.swapSeats(selectedClassroom!.id, seatToSwap, seatId);
        success('Seats Swapped', 'The teams have been successfully swapped.');
      } catch (err: any) {
        toastError('Swap Failed', err.message);
      } finally {
        setIsProcessing(false);
        setSwapMode(false);
        setSeatToSwap(null);
      }
      return;
    }

    if (selectedSeat === seatId) {
      setSelectedSeat(null);
    } else {
      setSelectedSeat(seatId);
    }
  };

  const handleAssignSeat = async () => {
    if (!selectedClassroom || !selectedSeat || !assignTeamId) return;
    setIsProcessing(true);
    try {
      await ClassroomService.assignSeat(selectedClassroom.id, selectedSeat, assignTeamId);
      success('Seat Assigned', `Team ${assignTeamId} assigned to seat ${selectedSeat}.`);
      setAssignTeamId('');
      setSelectedSeat(null);
    } catch (err: any) {
      toastError('Assignment Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveSeat = async (seatId: string) => {
    if (!selectedClassroom) return;
    setIsProcessing(true);
    try {
      await ClassroomService.removeSeat(selectedClassroom.id, seatId);
      success('Team Removed', 'The seat is now available.');
      setSelectedSeat(null);
    } catch (err: any) {
      toastError('Removal Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const startSwap = (seatId: string) => {
    setSwapMode(true);
    setSeatToSwap(seatId);
  };

  const columns: Column<Classroom>[] = [
    {
      header: 'Room',
      accessorKey: 'roomNumber',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-bebas text-lg tracking-wide text-white">{row.roomNumber}</p>
          <p className="text-xs text-gray-500 font-inter">{row.building} • Floor {row.floor}</p>
        </div>
      )
    },
    {
      header: 'Capacity',
      accessorKey: 'capacity',
      sortable: true,
      cell: (row) => {
        const occupied = (row.seatingPlan || []).filter(s => s.teamId).length;
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
        if (row.status === 'active') return <Badge variant="success">Active</Badge>;
        if (row.status === 'maintenance') return <Badge variant="warning">Maintenance</Badge>;
        return <Badge variant="danger">Offline</Badge>;
      }
    },
    {
      header: 'Staff',
      accessorKey: 'assignedVolunteers',
      cell: (row) => (
        <div className="flex flex-col gap-1 text-xs font-inter text-gray-400">
          <span>{(row.assignedVolunteers || []).length} Volunteers</span>
          <span>{(row.assignedMentors || []).length} Mentors</span>
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
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-3">
             <School className="w-8 h-8 text-primary" /> CLASSROOM MANAGER
          </h1>
          <p className="font-inter text-gray-400">Manage venue spaces, capacity, and seating allocations.</p>
        </div>
        <div className="flex gap-3">
          {hasPermission('classrooms.manage') && (
            <Button variant="primary" leftIcon={MapPin}>ADD CLASSROOM</Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable 
            data={classrooms} 
            columns={columns} 
            searchable 
            searchKey="roomNumber"
          />
        </CardContent>
      </Card>

      <Modal isOpen={settingsModalOpen} onClose={() => { setSettingsModalOpen(false); setSelectedClassroom(null); }} title="Classroom Settings" size="4xl">
        {selectedClassroom && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="col-span-1">
                <Label>Capacity</Label>
                <Input type="number" value={capacity} onChange={e => setCapacity(Number(e.target.value))} />
              </div>
              <div className="col-span-1">
                <Label>Rows</Label>
                <Input type="number" value={rows} onChange={e => setRows(Number(e.target.value))} />
              </div>
              <div className="col-span-1">
                <Label>Columns</Label>
                <Input type="number" value={columnsState} onChange={e => setColumnsState(Number(e.target.value))} />
              </div>
              <div className="col-span-1 flex items-end">
                <Button variant="primary" leftIcon={LayoutGrid} className="w-full" onClick={handleGenerateSeats} isLoading={isProcessing}>
                  Generate Grid
                </Button>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" leftIcon={Users} onClick={handleBulkAutoAssign} isLoading={isProcessing}>
                Bulk Auto Assign
              </Button>
              <Button variant="outline" className="text-red-400 border-red-500/20 hover:bg-red-500/10" leftIcon={RotateCcw} onClick={handleResetSeats} isLoading={isProcessing}>
                Reset Seats
              </Button>
              <Button variant="outline" className="text-blue-400 border-blue-500/20 hover:bg-blue-500/10" onClick={() => {
                if (!selectedClassroom) return;
                const plan = selectedClassroom.seatingPlan || [];
                const rows = plan.map(seat => {
                  const team = teams.find(t => t.id === seat.teamId);
                  return `"${seat.seatId}","${team?.id || ''}","${team?.name || 'Empty'}","${team?.track || ''}"`;
                });
                const csvContent = ["Seat ID,Team ID,Team Name,Track", ...rows].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `Classroom_${selectedClassroom.roomNumber}_Seating.csv`;
                link.click();
              }}>
                Export CSV
              </Button>
              <Button variant="outline" className="text-green-400 border-green-500/20 hover:bg-green-500/10" onClick={() => {
                if (!selectedClassroom) return;
                const plan = selectedClassroom.seatingPlan || [];
                const printWindow = window.open('', '_blank');
                if (!printWindow) return;
                let html = `<html><head><title>Classroom ${selectedClassroom.roomNumber} Seating Plan</title><style>body { font-family: sans-serif; padding: 20px; } h1 { text-align: center; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ccc; padding: 10px; text-align: left; } th { background-color: #f4f4f4; }</style></head><body><h1>Classroom ${selectedClassroom.roomNumber} Seating Plan</h1><p>Capacity: ${selectedClassroom.capacity} | Rows: ${selectedClassroom.rows} | Cols: ${selectedClassroom.columns}</p><table><thead><tr><th>Seat ID</th><th>Team ID</th><th>Team Name</th><th>Track</th></tr></thead><tbody>`;
                plan.forEach(seat => {
                  const team = teams.find(t => t.id === seat.teamId);
                  html += `<tr><td>${seat.seatId}</td><td>${team?.id || ''}</td><td>${team?.name || 'Empty'}</td><td>${team?.track || ''}</td></tr>`;
                });
                html += `</tbody></table><script>window.onload = () => { window.print(); window.close(); }</script></body></html>`;
                printWindow.document.write(html);
                printWindow.document.close();
              }}>
                Print Plan
              </Button>
            </div>

            {swapMode && (
              <div className="p-3 bg-primary/20 border border-primary text-primary font-inter text-sm rounded-lg flex items-center justify-between">
                <span>Swap Mode Active: Click another seat to swap with {seatToSwap}.</span>
                <Button variant="ghost" size="sm" onClick={() => { setSwapMode(false); setSeatToSwap(null); }} className="h-6 w-6 p-0 text-primary">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 overflow-x-auto bg-[#0a0a0a] rounded-xl border border-white/10 p-6 min-h-[400px]">
                {(!selectedClassroom.seatingPlan || selectedClassroom.seatingPlan.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-gray-500 font-inter">
                    No seating plan generated yet.
                  </div>
                ) : (
                  <div 
                    className="grid gap-3 mx-auto" 
                    style={{ 
                      gridTemplateColumns: `repeat(${selectedClassroom.columns || columnsState}, minmax(0, 1fr))`,
                      width: 'fit-content'
                    }}
                  >
                    {selectedClassroom.seatingPlan.map((seat) => {
                      const isSelected = selectedSeat === seat.seatId;
                      const isSwapping = seatToSwap === seat.seatId;
                      const occupied = !!seat.teamId;
                      const team = teams.find(t => t.id === seat.teamId);

                      return (
                        <button
                          key={seat.seatId}
                          onClick={() => handleSeatClick(seat.seatId)}
                          disabled={isProcessing}
                          className={`
                            relative p-3 w-20 h-20 rounded-xl border flex flex-col items-center justify-center transition-all
                            ${isSwapping ? 'ring-2 ring-primary bg-primary/20 border-primary' : ''}
                            ${isSelected && !isSwapping ? 'ring-2 ring-white bg-white/10 border-white/30' : ''}
                            ${!isSelected && !isSwapping && occupied ? 'bg-white/5 border-white/20 hover:bg-white/10' : ''}
                            ${!isSelected && !isSwapping && !occupied ? 'bg-transparent border-white/5 border-dashed hover:border-white/20 hover:bg-white/5' : ''}
                          `}
                        >
                          <span className={`text-sm font-bebas tracking-wider ${occupied ? 'text-white' : 'text-gray-500'}`}>
                            {seat.seatId}
                          </span>
                          {occupied ? (
                            <>
                              <span className="text-[10px] font-mono text-primary mt-1">{team?.id || seat.teamId}</span>
                              <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500" title="Occupied" />
                            </>
                          ) : (
                            <span className="text-[9px] uppercase font-inter text-gray-600 mt-1">Available</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedSeat && !swapMode && (
                <div className="w-full md:w-80 shrink-0 space-y-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <h3 className="font-bebas text-xl text-white mb-4">Seat {selectedSeat}</h3>
                    
                    {(() => {
                      const seat = selectedClassroom.seatingPlan?.find(s => s.seatId === selectedSeat);
                      const team = teams.find(t => t.id === seat?.teamId);

                      if (seat?.teamId) {
                        return (
                          <div className="space-y-4">
                            <div>
                              <Label className="text-gray-500">Assigned Team</Label>
                              <div className="font-inter text-white">{team?.name || 'Unknown Team'}</div>
                              <div className="text-xs text-primary font-mono">{seat.teamId}</div>
                              <div className="text-xs text-gray-400 font-mono mt-1">Track: {team?.track || 'N/A'}</div>
                            </div>
                            <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
                              <Button variant="outline" size="sm" onClick={() => startSwap(selectedSeat)}>Swap Seat</Button>
                              <Button variant="outline" size="sm" className="text-red-400 border-red-500/20 hover:bg-red-500/10" onClick={() => handleRemoveSeat(selectedSeat)} isLoading={isProcessing}>Remove Team</Button>
                            </div>
                          </div>
                        );
                      } else {
                        const unassignedTeams = teams.filter(t => !t.assignedSeat && t.assignedRoom !== selectedClassroom.id);
                        return (
                          <div className="space-y-4">
                            <div>
                              <Label className="text-gray-500">Status</Label>
                              <div className="font-inter text-green-500 text-sm">Available</div>
                            </div>
                            <div className="pt-4 border-t border-white/10">
                              <Label>Assign Team</Label>
                              <select
                                value={assignTeamId}
                                onChange={e => setAssignTeamId(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50 font-inter text-sm mb-3 mt-1"
                              >
                                <option value="">-- Select a Team --</option>
                                {unassignedTeams.map(t => (
                                  <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                                ))}
                              </select>
                              <Button variant="primary" size="sm" className="w-full" onClick={handleAssignSeat} disabled={!assignTeamId} isLoading={isProcessing}>
                                Assign
                              </Button>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
