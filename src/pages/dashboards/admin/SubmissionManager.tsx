import React, { useState, useEffect } from 'react';
import { Code2, Download, Lock, Unlock, Eye, Edit2, AlertCircle, Save } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Input, Label, Select } from '../../../components/ui/Form';
import { useToast } from '../../../components/ui/ToastContext';
import { SubmissionService } from '../../../services/SubmissionService';
import { SubmissionConfigService } from '../../../services/SubmissionConfigService';
import { TeamService } from '../../../services/TeamService';
import { ParticipantService } from '../../../services/ParticipantService';
import { AuditService } from '../../../services/AuditService';
import { useAuth } from '../../../contexts/AuthContext';
import type { Submission, Team, Participant, SubmissionField } from '../../../types/models';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Extend jsPDF for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface EnrichedSubmission extends Submission {
  teamName: string;
  track: string;
  leaderName: string;
  college: string;
  projectName: string;
}

export default function SubmissionManager() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [submissions, setSubmissions] = useState<EnrichedSubmission[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [participants, setParticipants] = useState<Record<string, Participant>>({});
  const [fieldsConfig, setFieldsConfig] = useState<SubmissionField[]>([]);
  
  const [previewSubmission, setPreviewSubmission] = useState<EnrichedSubmission | null>(null);
  const [editSubmission, setEditSubmission] = useState<EnrichedSubmission | null>(null);
  
  // Edit State
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubTeams = TeamService.subscribeToAllTeams((teamsList) => {
      const teamsMap = teamsList.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
      }, {} as Record<string, Team>);
      setTeams(teamsMap);
    });
    
    const unsubParticipants = ParticipantService.subscribeToAllParticipants((parts) => {
      const partsMap = parts.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, Participant>);
      setParticipants(partsMap);
    });
    
    const unsubFields = SubmissionConfigService.subscribeToConfig((config) => {
      setFieldsConfig(config);
    });

    return () => {
      unsubTeams();
      unsubParticipants();
      unsubFields();
    };
  }, []);

  useEffect(() => {
    const unsubSubmissions = SubmissionService.subscribeToAllSubmissions((subs) => {
      const enriched = subs.map(sub => {
        const team = teams[sub.teamId];
        const leader = team ? participants[team.leaderId] : null;
        
        return {
          ...sub,
          teamName: team?.name || 'Unknown Team',
          track: team?.track || 'Unknown Track',
          leaderName: leader?.name || 'Unknown',
          college: leader?.college || 'Unknown',
          // Try to extract project name from dynamic fields
          projectName: sub.fields['name'] || sub.fields['project_name'] || sub.fields['title'] || 'Unnamed Project'
        };
      });
      setSubmissions(enriched);
    });

    return () => unsubSubmissions();
  }, [teams, participants]);

  const handleUpdateStatus = async (id: string, status: 'draft' | 'submitted' | 'locked' | 'late') => {
    try {
      await SubmissionService.updateStatus(id, status);
      if (user) {
        await AuditService.logAction({
          actorId: user.uid,
          actorRole: 'organizer',
          action: 'update_submission_status',
          targetId: id,
          resourceType: 'submission',
          metadata: { status }
        });
      }
      success(`Submission marked as ${status}`);
    } catch (err) {
      error('Failed to update submission status');
    }
  };

  const handleSaveEdit = async () => {
    if (!editSubmission || !user) return;
    setIsSaving(true);
    try {
      await SubmissionService.submitFinal(editSubmission.teamId, editData, editSubmission.status === 'late');
      
      // We also need to save internal notes if they changed
      // Wait, SubmissionService.submitFinal only updates fields and status, not internalNotes.
      // Let's add a custom update for notes
      await SubmissionService.updateInternalNotes(editSubmission.id, editNotes);
      
      await AuditService.logAction({
        actorId: user.uid,
        actorRole: 'organizer',
        action: 'edit_submission',
        targetId: editSubmission.id,
        resourceType: 'submission',
        metadata: { updatedFields: Object.keys(editData) }
      });
      
      success('Submission updated successfully');
      setEditSubmission(null);
    } catch (err) {
      error('Failed to update submission');
    } finally {
      setIsSaving(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Team ID', 'Team Name', 'Track', 'College', 'Leader', 'Status', 'Updated At', ...fieldsConfig.map(f => f.name), 'Internal Notes'];
    const rows = submissions.map(s => [
      s.teamId,
      s.teamName,
      s.track,
      s.college,
      s.leaderName,
      s.status,
      new Date(s.updatedAt).toLocaleString(),
      ...fieldsConfig.map(f => s.fields[f.id] || ''),
      s.internalNotes || ''
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.map(h => `"${h}"`).join(",") + "\n"
      + rows.map(e => e.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "submissions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const exportToExcel = () => {
    const data = submissions.map(s => {
      const row: any = {
        'Team Name': s.teamName,
        'Track': s.track,
        'College': s.college,
        'Leader': s.leaderName,
        'Status': s.status,
        'Last Updated': new Date(s.updatedAt).toLocaleString(),
        'Internal Notes': s.internalNotes || ''
      };
      
      fieldsConfig.forEach(f => {
        row[f.name] = s.fields[f.id] || '';
      });
      return row;
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Submissions");
    XLSX.writeFile(wb, "submissions.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("GLITCH 36 - Submissions Export", 14, 15);
    
    const tableData = submissions.map(s => [
      s.teamName,
      s.track,
      s.college,
      s.status.toUpperCase(),
      new Date(s.updatedAt).toLocaleString()
    ]);
    
    doc.autoTable({
      startY: 20,
      head: [['Team', 'Track', 'College', 'Status', 'Last Updated']],
      body: tableData,
    });
    
    doc.save('submissions.pdf');
  };

  const columns: Column<EnrichedSubmission>[] = [
    {
      header: 'Team Name',
      accessorKey: 'teamName',
      searchable: true,
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-inter text-white font-medium block">{row.teamName}</span>
          <span className="font-mono text-xs text-gray-500">{row.projectName}</span>
        </div>
      )
    },
    {
      header: 'Leader & College',
      accessorKey: 'leaderName',
      searchable: true,
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-inter text-gray-300 block">{row.leaderName}</span>
          <span className="font-mono text-xs text-gray-500">{row.college}</span>
        </div>
      )
    },
    {
      header: 'Track',
      accessorKey: 'track',
      sortable: true,
      cell: (row) => <Badge variant="outline">{row.track}</Badge>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (row) => {
        switch (row.status) {
          case 'submitted': return <Badge variant="success">Submitted</Badge>;
          case 'draft': return <Badge variant="outline">Draft</Badge>;
          case 'locked': return <Badge variant="danger">Locked</Badge>;
          case 'late': return <Badge variant="warning">Late</Badge>;
          default: return <Badge variant="outline">{row.status}</Badge>;
        }
      }
    },
    {
      header: 'Last Updated',
      accessorKey: 'updatedAt',
      sortable: true,
      cell: (row) => <span className="font-inter text-sm text-gray-400">{new Date(row.updatedAt).toLocaleString()}</span>
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPreviewSubmission(row)} className="text-blue-400">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {
            setEditSubmission(row);
            setEditData(row.fields || {});
            setEditNotes(row.internalNotes || '');
          }} className="text-gray-400">
            <Edit2 className="w-4 h-4" />
          </Button>
          
          {row.status === 'locked' ? (
            <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(row.id, 'submitted')} className="text-green-400">
              <Unlock className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(row.id, 'locked')} className="text-red-400">
              <Lock className="w-4 h-4" />
            </Button>
          )}
          
          {row.status !== 'late' && (
            <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(row.id, 'late')} className="text-yellow-400">
              <AlertCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <Code2 className="w-8 h-8 text-primary" /> SUBMISSIONS MANAGER
          </h2>
          <p className="font-inter text-gray-400">Monitor all project submissions, lock edits, and export data.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          <DataTable 
            columns={columns} 
            data={submissions}
            searchable
            searchKey="teamName"
            emptyMessage="No submissions found."
          />
        </div>
      </Card>

      {/* Preview Modal */}
      <Modal isOpen={!!previewSubmission} onClose={() => setPreviewSubmission(null)} title="SUBMISSION PREVIEW">
        {previewSubmission && (
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <h3 className="font-bebas text-2xl text-white">{previewSubmission?.teamName || 'Unnamed Team'}</h3>
                <p className="text-sm text-gray-400 font-inter">{previewSubmission?.college || 'N/A'} | {previewSubmission?.track || 'N/A'}</p>
              </div>
              <Badge variant={previewSubmission?.status === 'locked' ? 'danger' : previewSubmission?.status === 'late' ? 'warning' : previewSubmission?.status === 'submitted' ? 'success' : 'outline'}>
                {previewSubmission?.status?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>
            
            <div className="space-y-4 max-h-[50vh] overflow-y-auto px-1">
              {fieldsConfig.map(field => (
                <div key={field.id} className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <span className="text-xs text-gray-500 font-inter uppercase block mb-1">{field.name}</span>
                  {field.type === 'url' && previewSubmission.fields[field.id] ? (
                    <a href={previewSubmission.fields[field.id]} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-inter break-all text-sm">
                      {previewSubmission.fields[field.id]}
                    </a>
                  ) : (
                    <p className="text-white font-inter text-sm whitespace-pre-wrap">{previewSubmission.fields[field.id] || 'Not provided'}</p>
                  )}
                </div>
              ))}
              
              {previewSubmission.internalNotes && (
                <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                  <span className="text-xs text-primary font-inter uppercase block mb-1">INTERNAL NOTES (HIDDEN FROM PARTICIPANT)</span>
                  <p className="text-primary-100 font-inter text-sm whitespace-pre-wrap">{previewSubmission.internalNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editSubmission} onClose={() => setEditSubmission(null)} title="EDIT SUBMISSION (ADMIN)">
        {editSubmission && (
          <div className="space-y-6">
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-400 font-medium">Administrative Edit</p>
                <p className="text-xs text-yellow-500/80 mt-1">Changes made here will overwrite participant data and generate an audit log.</p>
              </div>
            </div>
            
            <div className="space-y-4 max-h-[50vh] overflow-y-auto px-1">
              {fieldsConfig.map(field => (
                <div key={field.id}>
                  <Label>{field.name}</Label>
                  {field.type === 'textarea' ? (
                    <textarea 
                      className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white font-inter text-sm min-h-[100px]"
                      value={editData[field.id] || ''}
                      onChange={(e) => setEditData({ ...editData, [field.id]: e.target.value })}
                    />
                  ) : (
                    <Input 
                      value={editData[field.id] || ''}
                      onChange={(e) => setEditData({ ...editData, [field.id]: e.target.value })}
                    />
                  )}
                </div>
              ))}
              
              <div className="pt-4 border-t border-white/10">
                <Label className="text-primary">Internal Notes (Admin Only)</Label>
                <textarea 
                  className="w-full bg-primary/5 border border-primary/20 rounded-lg p-3 text-white font-inter text-sm min-h-[80px]"
                  placeholder="E.g., verified GitHub link, waiting on PPT update..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button variant="ghost" onClick={() => setEditSubmission(null)}>CANCEL</Button>
              <Button variant="primary" onClick={handleSaveEdit} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
