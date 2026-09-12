import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, ArrowUpCircle, XCircle, RotateCcw, Download } from 'lucide-react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { TeamService } from '../../../services/TeamService';
import type { Team, TeamStatus } from '../../../types/models';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardContent } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/ToastContext';
import { Modal } from '../../../components/ui/Modal';
import { Label, Select as UISelect, Input as UIInput } from '../../../components/ui/Form';
import { usePermissions } from '../../../lib/permissions';

export default function TeamManager() {
  const { user, profile } = useAuth();
  const { hasPermission } = usePermissions();
  const { success, error: toastError } = useToast();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  // Modals
  const [isPromoteModalOpen, setPromoteModalOpen] = useState(false);
  const [isEliminateModalOpen, setEliminateModalOpen] = useState(false);
  const [isDisqualifyModalOpen, setDisqualifyModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'teams')), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(data);
      setLoading(false);
    });
    return () => unsub();
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
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (row) => {
        if (row.eliminated) return <Badge variant="danger">Eliminated</Badge>;
        if (row.disqualified) return <Badge variant="danger">Disqualified</Badge>;
        if (row.isWinner) return <Badge variant="success">Winner</Badge>;
        return <Badge variant="primary">{row.status.toUpperCase()}</Badge>;
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
              data={teams}
              searchable
              searchKey="name"
              emptyMessage="No teams found."
            />
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
