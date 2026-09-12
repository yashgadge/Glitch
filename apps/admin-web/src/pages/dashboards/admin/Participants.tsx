import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Edit, Shield, QrCode, Download, Send, Filter, MoreHorizontal, UserCheck, Search, Users, Trash2, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { usePermissions } from '@shared/lib/permissions';
import { useAuth } from '@shared/contexts/AuthContext';
import { useToast } from '../../../components/ui/ToastContext';
import { ParticipantService } from '@shared/services/ParticipantService';
import QuickEditModal from '../../../components/admin/QuickEditModal';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../components/ui/Modal';
import { Label, Select as UISelect, Input as UIInput } from '../../../components/ui/Form';
import type { Participant } from '@shared/types/models';

export default function Participants() {
  const [data, setData] = useState<Participant[]>([]);
  const [isLoading, setLoading] = useState(true);
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [selectedForQuickEdit, setSelectedForQuickEdit] = useState<Participant | null>(null);
  const [isGeneratingIds, setIsGeneratingIds] = useState(false);
  
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState('approved');
  
  const [selectedRows, setSelectedRows] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [staffIds, setStaffIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Note: To truly scale to 5000+ we should implement pagination or limits at the query level,
    // but we use the existing subscribeToAllParticipants and memoized filtering.
    const unsub = ParticipantService.subscribeToAllParticipants((pts) => {
      setData(pts);
      setLoading(false);
    });
    
    const unsubStaff = ParticipantService.subscribeToAllStaff((staff) => {
      setStaffIds(new Set(staff.map(s => s.id)));
    });

    return () => {
      unsub();
      if (unsubStaff) unsubStaff();
    };
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(p => {
      if (staffIds.has(p.id)) return false; // Hide staff members
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        return (
          (p.name && p.name.toLowerCase().includes(lowerSearch)) ||
          (p.email && p.email.toLowerCase().includes(lowerSearch)) ||
          (p.glitchId && p.glitchId.toLowerCase().includes(lowerSearch)) ||
          (p.teamId && p.teamId.toLowerCase().includes(lowerSearch)) ||
          (p.mobile && p.mobile.toLowerCase().includes(lowerSearch))
        );
      }
      
      return true;
    });
  }, [data, statusFilter, searchTerm]);

  // Bulk Actions
  const handleBulkExportCSV = () => {
    const toExport = selectedRows.length > 0 ? selectedRows : filteredData;
    if (toExport.length === 0) return;
    
    const headers = ['ID', 'Registration ID', 'Name', 'Email', 'College', 'Team ID', 'Status', 'Checked In'];
    const rows = toExport.map(p => [
      `"${(p.glitchId || p.id).replace(/"/g, '""')}"`,
      `"${(p.registrationId || '').replace(/"/g, '""')}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.email || '').replace(/"/g, '""')}"`,
      `"${(p.college || '').replace(/"/g, '""')}"`,
      `"${(p.teamId || '').replace(/"/g, '""')}"`,
      `"${(p.status || '').replace(/"/g, '""')}"`,
      `"${p.checkedIn ? 'Yes' : 'No'}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'glitch36_participants_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkNotification = () => {
    if (selectedRows.length === 0) {
      toastError('Bulk Action', 'Select at least one participant.');
      return;
    }
    alert(`Trigger Notification logic for ${selectedRows.length} participants.`);
  };

  const handleBulkGeneratePasses = () => {
    if (selectedRows.length === 0) {
      toastError('Bulk Action', 'Select at least one participant.');
      return;
    }
    alert(`Trigger Digital Pass logic for ${selectedRows.length} participants.`);
  };

  const handleGenerateMissingIds = async () => {
    if (!window.confirm("Are you sure you want to generate Participant IDs (GL26-P-...) for all legacy users who are missing them?")) return;
    
    setIsGeneratingIds(true);
    try {
      const count = await ParticipantService.generateMissingIds();
      success('IDs Generated', `Successfully assigned IDs to ${count} participants.`);
    } catch (e: any) {
      toastError('Generation Failed', e.message);
    } finally {
      setIsGeneratingIds(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    if (!user) return;
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${selectedRows.length} participants? This CANNOT be undone.`)) return;

    try {
      for (const p of selectedRows) {
        await ParticipantService.permanentDeleteParticipant(p.id, user.uid).catch(e => {
           console.error("Bulk delete failed for", p.id, e);
           ParticipantService.softDeleteParticipant(p.id, user.uid);
        });
      }
      success('Bulk Delete', `Successfully processed deletion for ${selectedRows.length} participants.`);
      setSelectedRows([]);
    } catch (e: any) {
      toastError('Bulk Delete Failed', e.message);
    }
  };

  const handleBulkUpdateStatus = async () => {
    if (selectedRows.length === 0) return;
    if (!user) return;
    setIsStatusModalOpen(true);
  };

  const confirmBulkStatusUpdate = async () => {
    try {
      for (const p of selectedRows) {
        await ParticipantService.transitionStatus(p.id, bulkStatusValue, user!.uid);
      }
      success('Bulk Update', `Successfully updated status to ${bulkStatusValue} for ${selectedRows.length} participants.`);
      setSelectedRows([]);
      setIsStatusModalOpen(false);
    } catch (e: any) {
      toastError('Bulk Update Failed', e.message);
    }
  };

  const handleDelete = async (participant: Participant) => {
    if (!user) return;
    if (!window.confirm(`Are you absolutely sure you want to delete ${participant.name}? This action cannot be undone.`)) return;
    
    try {
      await ParticipantService.permanentDeleteParticipant(participant.id, user.uid);
      success('Deleted', `${participant.name} has been permanently deleted.`);
    } catch (e: any) {
      console.error('Permanent delete failed, attempting soft delete:', e);
      // Fallback to soft delete if cloud function fails or is missing
      try {
        await ParticipantService.softDeleteParticipant(participant.id, user.uid);
        success('Soft Deleted', `${participant.name} has been suspended/soft-deleted.`);
      } catch (err: any) {
        toastError('Delete Failed', err.message || 'Could not delete participant.');
      }
    }
  };

  // Columns definition
  const columns: Column<Participant>[] = [
    {
      header: 'Participant',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-white">{row.name}</span>
          <span className="text-xs text-gray-500 font-mono">{row.glitchId || row.id.substring(0,8)}</span>
        </div>
      )
    },
    {
      header: 'Email & Mobile',
      accessorKey: 'email',
      cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm text-gray-300">{row.email}</span>
          <span className="text-xs text-gray-500">{row.mobile || 'No Mobile'}</span>
        </div>
      )
    },
    {
      header: 'College',
      accessorKey: 'college',
      sortable: true,
    },
    {
      header: 'Team',
      accessorKey: 'teamId',
      sortable: true,
      cell: (row) => row.teamId ? (
        <div className="flex flex-col">
          <Badge variant="outline">Team Assigned</Badge>
          <span className="text-xs text-gray-500 font-mono mt-1">{row.teamId}</span>
        </div>
      ) : <span className="text-gray-500 text-xs">No Team</span>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col gap-1">
          {row.status === 'active' ? <Badge variant="success">Active</Badge> : <Badge variant="warning">{row.status}</Badge>}
          {row.checkedIn && <Badge variant="default" className="bg-primary/20 text-primary border-none text-[10px]">Checked In</Badge>}
        </div>
      )
    },
    {
      header: 'Quick Actions',
      accessorKey: 'id',
      cell: (row) => (
        <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedForQuickEdit(row)} title="Quick Edit">
            <Edit className="w-4 h-4 text-gray-400 hover:text-white" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/workspace/participants/${row.id}`)} title="View Details">
            <MoreHorizontal className="w-4 h-4 text-gray-400 hover:text-white" />
          </Button>
          {hasPermission('participants.manage') && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-red-500/70 hover:text-red-500 hover:bg-red-500/10" 
              onClick={(e) => { e.stopPropagation(); handleDelete(row); }} 
              title="Delete Participant"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bebas tracking-wider text-white">PARTICIPANT MANAGEMENT</h1>
          <p className="text-gray-400 font-inter text-sm">Enterprise view to manage participants, teams, and access.</p>
        </div>
      </div>

      <Card className="bg-black/40 border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#111]">
          {/* Filters & Search */}
          <div className="flex gap-4 items-center w-full sm:w-auto">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text"
                placeholder="Search name, ID, email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm font-inter text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
              />
            </div>
            <select 
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Bulk Action Toolbar */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            {selectedRows.length > 0 && (
              <>
                <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">
                  {selectedRows.length} Selected
                </Badge>
                <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block"></div>
                <Button variant="outline" size="sm" onClick={handleBulkNotification}>
                  <Send className="w-3 h-3 mr-2" /> Notify
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkGeneratePasses}>
                  <QrCode className="w-3 h-3 mr-2" /> Passes
                </Button>
                <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block"></div>
                <Button variant="outline" size="sm" onClick={handleBulkUpdateStatus} className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10">
                  <ShieldAlert className="w-3 h-3 mr-2" /> Status
                </Button>
                {hasPermission('participants.manage') && (
                  <Button variant="outline" size="sm" onClick={handleBulkDelete} className="border-red-500/30 text-red-500 hover:bg-red-500/10">
                    <Trash2 className="w-3 h-3 mr-2" /> Delete
                  </Button>
                )}
              </>
            )}
            <Button variant="default" size="sm" onClick={handleBulkExportCSV}>
              <Download className="w-3 h-3 mr-2" /> {selectedRows.length > 0 ? 'Export Selected' : 'Export All'}
            </Button>
            <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block"></div>
            <Button variant="outline" size="sm" onClick={handleGenerateMissingIds} disabled={isGeneratingIds} className="border-primary/30 text-primary">
              <UserCheck className="w-3 h-3 mr-2" /> {isGeneratingIds ? 'Generating...' : 'Generate Missing IDs'}
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredData}
          selectable={true}
          onSelectionChange={(rows) => setSelectedRows(rows)}
          onRowClick={(row) => navigate(`/workspace/participants/${row.id}`)}
          pageSize={15}
          className="border-none"
        />
      </Card>

      {/* Bulk Status Modal */}
      <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Update Status">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Select a new status for the {selectedRows.length} selected participant(s).
          </p>
          <div>
            <Label>New Status</Label>
            <UISelect 
              value={bulkStatusValue} 
              onChange={(e) => setBulkStatusValue(e.target.value)}
              className="w-full mt-1"
            >
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
              <option value="active">Active</option>
            </UISelect>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <Button variant="ghost" onClick={() => setIsStatusModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={confirmBulkStatusUpdate}>Update Status</Button>
          </div>
        </div>
      </Modal>

      {selectedForQuickEdit && user && (
        <QuickEditModal
          open={true}
          onClose={() => setSelectedForQuickEdit(null)}
          participant={selectedForQuickEdit}
          adminId={user.uid}
        />
      )}
    </div>
  );
}
