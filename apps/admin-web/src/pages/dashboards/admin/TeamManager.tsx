import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, ArrowUpCircle, XCircle, RotateCcw, Download, Map, Check, Trash2 } from 'lucide-react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@shared/lib/firebase';
import { TeamService } from '@shared/services/TeamService';
import { TrackService } from '@shared/services/TrackService';
import type { Team, TeamStatus, Track } from '@shared/types/models';
import { useAuth } from '@shared/contexts/AuthContext';
import { Card, CardContent } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/ToastContext';
import { Modal } from '../../../components/ui/Modal';
import { Label, Select as UISelect, Input as UIInput } from '../../../components/ui/Form';
import { usePermissions } from '@shared/lib/permissions';
import { TeamDetailsModal } from '../../../components/admin/TeamDetailsModal';

export default function TeamManager() {
  const { user, profile } = useAuth();
  const { hasPermission } = usePermissions();
  const { success, error: toastError } = useToast();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackFilter, setTrackFilter] = useState<'all' | 'unassigned'>('all');

  const filteredTeams = React.useMemo(() => {
    if (trackFilter === 'unassigned') {
      return teams.filter(t => !t.trackId);
    }
    return teams;
  }, [teams, trackFilter]);

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  // Modals
  const [isPromoteModalOpen, setPromoteModalOpen] = useState(false);
  const [isEliminateModalOpen, setEliminateModalOpen] = useState(false);
  const [isDisqualifyModalOpen, setDisqualifyModalOpen] = useState(false);
  const [isTrackModalOpen, setTrackModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);

  useEffect(() => {
    const unsubTeams = onSnapshot(query(collection(db, 'teams')), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(data);
      setLoading(false);
    });
    const unsubTracks = TrackService.subscribeToTracks((data) => setTracks(data));
    return () => {
      unsubTeams();
      unsubTracks();
    };
  }, []);

  const handlePromote = async (formData: any) => {
    if (!selectedTeam || !user) return;
    try {
      await TeamService.promoteTeam(
        selectedTeam.id,
        parseInt(formData.nextRound, 10),
        formData.nextStatus as TeamStatus,
        user.uid
      );
      success('Team Promoted', `Successfully promoted ${selectedTeam.name}`);
      setPromoteModalOpen(false);
    } catch (e: any) {
      toastError('Promotion Failed', e.message);
    }
  };

  const handleEliminate = async (formData: any) => {
    if (!selectedTeam || !user) return;
    if (!formData.confirm) {
      toastError('Error', 'You must confirm the elimination.');
      return;
    }
    try {
      const reason = formData.reason === 'Other' ? formData.customReason : formData.reason;
      await TeamService.eliminateTeam(selectedTeam.id, reason, user.uid);
      success('Team Eliminated', `Successfully eliminated ${selectedTeam.name}`);
      setEliminateModalOpen(false);
    } catch (e: any) {
      toastError('Elimination Failed', e.message);
    }
  };

  const handleDisqualify = async (formData: any) => {
    if (!selectedTeam || !user) return;
    if (!formData.confirm) {
      toastError('Error', 'You must confirm the disqualification.');
      return;
    }
    try {
      await TeamService.disqualifyTeam(selectedTeam.id, formData.reason, user.uid);
      success('Team Disqualified', `Successfully disqualified ${selectedTeam.name}`);
      setDisqualifyModalOpen(false);
    } catch (e: any) {
      toastError('Disqualification Failed', e.message);
    }
  };

  const handleRestore = async (team: Team) => {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to restore ${team.name}?`)) return;
    try {
      await TeamService.restoreTeam(team.id, user.uid);
      success('Team Restored', `Successfully restored ${team.name}`);
    } catch (e: any) {
      toastError('Restore Failed', e.message);
    }
  };

  const handleUpdateTrack = async (formData: any) => {
    if (!selectedTeam) return;
    try {
      const trackId = formData.trackId;
      const track = tracks.find(t => t.id === trackId);
      if (!track) throw new Error("Invalid track selected");
      
      await TeamService.adminUpdateTeamSelection(selectedTeam.id, track.id, track.name, selectedTeam.problemId || '');
      success('Track Updated', `Successfully updated track for ${selectedTeam.name}`);
      setTrackModalOpen(false);
    } catch (e: any) {
      toastError('Update Failed', e.message);
    }
  };

  const handleManualConfirm = async (team: Team) => {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to manually confirm payment for ${team.name}? This will mark them as paid and generate passes for members.`)) return;
    try {
      await TeamService.adminManualConfirmTeam(team.id);
      success('Team Confirmed', `Successfully confirmed payment for ${team.name}`);
    } catch (e: any) {
      toastError('Confirmation Failed', e.message);
    }
  };

  const handleDeleteTeam = async (formData: any) => {
    if (!selectedTeam) return;
    if (formData.confirmText !== selectedTeam.name) {
      toastError('Error', 'Team name does not match.');
      return;
    }
    try {
      await TeamService.adminDeleteTeam(selectedTeam.id);
      success('Team Deleted', `Successfully deleted ${selectedTeam.name}`);
      setDeleteModalOpen(false);
    } catch (e: any) {
      toastError('Delete Failed', e.message);
    }
  };

  const columns: Column<Team>[] = [
    {
      header: 'Team',
      accessorKey: 'name',
      searchable: true,
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium text-white">{row.name}</p>
          <p className="text-xs text-gray-500">{row.id}</p>
        </div>
      )
    },
    {
      header: 'Round',
      accessorKey: 'currentRound',
      sortable: true,
      cell: (row) => <span className="font-bebas text-lg tracking-wider text-gray-300">{row.currentRound}</span>
    },
    { 
      header: 'Track & Problem', 
      accessorKey: 'track',
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-bebas text-lg tracking-wider text-primary">{row.track || 'None'}</span>
            {row.trackLocked && <Lock className="w-3 h-3 text-red-400" title="Track Locked by Team" />}
          </div>
          {row.problemId ? (
            <span className="text-xs text-gray-400 font-inter truncate max-w-[200px]" title={row.problemId}>
              {row.problemId}
            </span>
          ) : (
            <span className="text-xs text-gray-600 font-inter italic">No problem selected</span>
          )}
        </div>
      )
    },
    {
      header: 'Location',
      accessorKey: 'assignedRoom',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-inter text-sm text-white">{row.assignedRoom || 'Unassigned'}</p>
          {row.assignedSeat && <p className="text-xs text-gray-500 font-mono">Seat {row.assignedSeat}</p>}
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (row) => {
        let statusBadge;
        if (row.eliminated) statusBadge = <Badge variant="danger">Eliminated</Badge>;
        else if (row.disqualified) statusBadge = <Badge variant="danger">Disqualified</Badge>;
        else if (row.isWinner) statusBadge = <Badge variant="success">Winner</Badge>;
        else statusBadge = <Badge variant="primary">{row.status.toUpperCase()}</Badge>;

        return (
          <div className="flex flex-col gap-1 items-start">
            {statusBadge}
            {row.paymentStatus?.toUpperCase() === 'PAID' ? (
              <Badge variant="success" className="bg-green-500/10 text-green-400 border-green-500/50 text-[10px] px-1.5 py-0">PAID</Badge>
            ) : (
              <Badge variant="warning" className="text-[10px] px-1.5 py-0">PAYMENT PENDING</Badge>
            )}
          </div>
        );
      }
    },
    {
      header: 'Members',
      accessorKey: 'memberIds',
      cell: (row) => <span className="text-gray-400">{row.memberIds.length} / 4</span>
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (row) => (
        <div className="flex gap-2 flex-wrap max-w-[200px]">
          {!row.eliminated && !row.disqualified && !row.isWinner && hasPermission('teams.manage') && (
            <>
              {row.paymentStatus?.toUpperCase() !== 'PAID' && hasPermission('teams.manage') && (
                <Button variant="outline" size="sm" onClick={() => handleManualConfirm(row)} className="text-green-400 border-green-400/30 hover:bg-green-400/10" title="Confirm Payment manually">
                  <Check className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => { setSelectedTeam(row); setTrackModalOpen(true); }} className="text-purple-400 border-purple-400/30 hover:bg-purple-400/10" title="Change Track">
                <Map className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setSelectedTeam(row); setPromoteModalOpen(true); }} className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10" title="Promote">
                <ArrowUpCircle className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setSelectedTeam(row); setEliminateModalOpen(true); }} className="text-orange-400 border-orange-400/30 hover:bg-orange-400/10" title="Eliminate">
                <XCircle className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setSelectedTeam(row); setDisqualifyModalOpen(true); }} className="text-red-400 border-red-400/30 hover:bg-red-400/10" title="Disqualify">
                <AlertTriangle className="w-4 h-4" />
              </Button>
            </>
          )}
          {(row.eliminated || row.disqualified) && profile?.role === 'super_admin' && (
            <Button variant="outline" size="sm" onClick={() => handleRestore(row)} className="text-green-400 border-green-400/30 hover:bg-green-400/10" title="Restore">
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
          {(hasPermission('teams.manage') || profile?.role === 'super_admin') && (
            <Button variant="outline" size="sm" onClick={() => { setSelectedTeam(row); setDeleteModalOpen(true); }} className="text-red-500 border-red-500/30 hover:bg-red-500/10 ml-2" title="Delete Team">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" /> TEAM LIFECYCLE MANAGER
          </h2>
          <p className="font-inter text-gray-400">Manage team promotions, eliminations, and disqualifications.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant={trackFilter === 'unassigned' ? 'primary' : 'outline'} 
            onClick={() => setTrackFilter(prev => prev === 'all' ? 'unassigned' : 'all')}
          >
            {trackFilter === 'unassigned' ? 'SHOW ALL TEAMS' : 'SHOW UNASSIGNED TRACKS'}
          </Button>
          <Button variant="outline" leftIcon={Download}>EXPORT TEAMS</Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="p-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading teams...</div>
          ) : (
            <DataTable 
              columns={columns} 
              data={filteredTeams}
              searchable
              searchKey="name"
              emptyMessage="No teams found."
              onRowClick={(row) => {
                setSelectedTeam(row);
                setDetailsModalOpen(true);
              }}
            />
          )}
        </CardContent>
      </Card>

      <TeamDetailsModal 
        isOpen={isDetailsModalOpen} 
        onClose={() => setDetailsModalOpen(false)} 
        team={selectedTeam} 
      />

      {/* Promote Modal */}
      <Modal isOpen={isPromoteModalOpen} onClose={() => setPromoteModalOpen(false)} title="Promote Team">
        {selectedTeam && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-400">Team</p>
              <p className="text-lg text-white font-medium">{selectedTeam.name}</p>
              <p className="text-sm text-gray-400 mt-2">Current Round: {selectedTeam.currentRound}</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const fd = Object.fromEntries(new FormData(e.currentTarget)); handlePromote(fd); }} className="space-y-4">
              <div><Label>Next Round</Label>
                <UIInput name="nextRound" type="number" required defaultValue={selectedTeam.currentRound + 1} min={1} />
              </div>
              <div><Label>Next Status</Label>
                <UISelect name="nextStatus" required>
                  <option value="">Select Status...</option>
                  <option value="qualified">Qualified</option>
                  <option value="round_1">Round 1</option>
                  <option value="round_2">Round 2</option>
                  <option value="round_3">Round 3</option>
                  <option value="semi_final">Semi Final</option>
                  <option value="final">Final</option>
                  <option value="winner">Winner</option>
                </UISelect>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <Button variant="ghost" type="button" onClick={() => setPromoteModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Promote Team</Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Track Update Modal */}
      <Modal isOpen={isTrackModalOpen} onClose={() => setTrackModalOpen(false)} title="Change Team Track">
        {selectedTeam && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-400">Team</p>
              <p className="text-lg text-white font-medium">{selectedTeam.name}</p>
              <p className="text-sm text-gray-400 mt-2">Current Track: {selectedTeam.track || 'None'}</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const fd = Object.fromEntries(new FormData(e.currentTarget)); handleUpdateTrack(fd); }} className="space-y-4">
              <div><Label>New Track</Label>
                <UISelect name="trackId" required defaultValue={selectedTeam.trackId || ''}>
                  <option value="">Select a Track...</option>
                  {tracks.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </UISelect>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <Button variant="ghost" type="button" onClick={() => setTrackModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Update Track</Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Eliminate Modal */}
      <Modal isOpen={isEliminateModalOpen} onClose={() => setEliminateModalOpen(false)} title="Eliminate Team">
        {selectedTeam && (
          <div className="space-y-4">
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <h3 className="text-orange-400 font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> WARNING</h3>
              <p className="text-orange-200/70 text-sm mt-1">
                You are about to eliminate <strong>{selectedTeam.name}</strong> from the competition. This will lock their submissions and prevent them from being evaluated.
              </p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const fd = Object.fromEntries(new FormData(e.currentTarget)); handleEliminate(fd); }} className="space-y-4">
              <div><Label>Reason for Elimination</Label>
                <UISelect name="reason" required>
                  <option value="">Select Reason...</option>
                  <option value="Low Score">Low Score</option>
                  <option value="No Show">No Show</option>
                  <option value="Late Submission">Late Submission</option>
                  <option value="Organizer Decision">Organizer Decision</option>
                  <option value="Other">Other</option>
                </UISelect>
              </div>
              <div><Label>Custom Reason (if Other)</Label>
                <UIInput name="customReason" placeholder="Specify reason..." />
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-gray-900 rounded-lg border border-gray-800">
                <input type="checkbox" name="confirm" id="confirmEliminate" required className="w-5 h-5 accent-orange-500" />
                <label htmlFor="confirmEliminate" className="text-sm text-gray-300">
                  I confirm that {selectedTeam.name} should be eliminated.
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <Button variant="ghost" type="button" onClick={() => setEliminateModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white">Eliminate Team</Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Disqualify Modal */}
      <Modal isOpen={isDisqualifyModalOpen} onClose={() => setDisqualifyModalOpen(false)} title="Disqualify Team">
        {selectedTeam && (
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <h3 className="text-red-400 font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> CRITICAL WARNING</h3>
              <p className="text-red-200/70 text-sm mt-1">
                Disqualification is a severe action reserved for rule violations. <strong>{selectedTeam.name}</strong> will be permanently removed from rankings.
              </p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const fd = Object.fromEntries(new FormData(e.currentTarget)); handleDisqualify(fd); }} className="space-y-4">
              <div><Label>Reason for Disqualification</Label>
                <UIInput name="reason" required placeholder="e.g. Plagiarism, Rule Violation..." />
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-gray-900 rounded-lg border border-gray-800">
                <input type="checkbox" name="confirm" id="confirmDisqualify" required className="w-5 h-5 accent-red-500" />
                <label htmlFor="confirmDisqualify" className="text-sm text-gray-300">
                  I confirm that {selectedTeam.name} must be disqualified.
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <Button variant="ghost" type="button" onClick={() => setDisqualifyModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="danger">Disqualify Team</Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Team">
        {selectedTeam && (
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <h3 className="text-red-400 font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> DANGER ZONE</h3>
              <p className="text-red-200/70 text-sm mt-1">
                You are about to permanently delete <strong>{selectedTeam.name}</strong>. This will unlink all members and delete submissions. This action is irreversible.
              </p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const fd = Object.fromEntries(new FormData(e.currentTarget)); handleDeleteTeam(fd); }} className="space-y-4">
              <div><Label>Type "{selectedTeam.name}" to confirm</Label>
                <UIInput name="confirmText" required placeholder={selectedTeam.name} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <Button variant="ghost" type="button" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="danger">Delete Permanently</Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
