import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Edit, Shield, QrCode, Download, Send, Filter, MoreHorizontal, UserCheck, Search, Users, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { usePermissions } from '../../../lib/permissions';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/ToastContext';
import { ParticipantService } from '../../../services/ParticipantService';
import QuickEditModal from '../../../components/admin/QuickEditModal';
import { useNavigate } from 'react-router-dom';
import type { Participant } from '../../../types/models';

export default function Participants() {
  const [data, setData] = useState<Participant[]>([]);
  const [isLoading, setLoading] = useState(true);
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [selectedForQuickEdit, setSelectedForQuickEdit] = useState<Participant | null>(null);
  
  const [selectedRows, setSelectedRows] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    // Note: To truly scale to 5000+ we should implement pagination or limits at the query level,
    // but we use the existing subscribeToAllParticipants and memoized filtering.
    const unsub = ParticipantService.subscribeToAllParticipants((pts) => {
      setData(pts.filter(p => p.role === 'participant'));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(p => {
      if (trackFilter !== 'all' && p.track !== trackFilter) return false;
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
  }, [data, trackFilter, statusFilter, searchTerm]);

  // Bulk Actions
  const handleBulkExportCSV = () => {
    const toExport = selectedRows.length > 0 ? selectedRows : filteredData;
    if (toExport.length === 0) return;
    
    const headers = ['ID', 'Registration ID', 'Name', 'Email', 'College', 'Track', 'Team ID', 'Status', 'Checked In'];
    const rows = toExport.map(p => [
      `"${(p.glitchId || p.id).replace(/"/g, '""')}"`,
      `"${(p.registrationId || '').replace(/"/g, '""')}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.email || '').replace(/"/g, '""')}"`,
      `"${(p.college || '').replace(/"/g, '""')}"`,
      `"${(p.track || '').replace(/"/g, '""')}"`,
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
      header: 'Track',
      accessorKey: 'track',
      sortable: true,
      cell: (row) => row.track ? <Badge variant="outline">{row.track}</Badge> : <span className="text-gray-500 text-xs">Unassigned</span>
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
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
            >
              <option value="all">All Tracks</option>
              <option value="Web3">Web3</option>
              <option value="AI">AI</option>
              <option value="Cloud">Cloud</option>
            </select>
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
              </>
            )}
            <Button variant="default" size="sm" onClick={handleBulkExportCSV}>
              <Download className="w-3 h-3 mr-2" /> {selectedRows.length > 0 ? 'Export Selected' : 'Export All'}
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

      {/* Modals & Drawers */}
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
