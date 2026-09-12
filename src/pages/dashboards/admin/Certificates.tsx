import React, { useState, useEffect } from 'react';
import { Award, ShieldAlert, CheckCircle2, XCircle, Search, Wand2 } from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Card } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input, Label } from '../../../components/ui/Form';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/ToastContext';
import { CertificateService } from '../../../lib/CertificateService';
import type { CertificateMetadata, CertificateType } from '../../../lib/CertificateService';
import { useAuth } from '../../../contexts/AuthContext';
import { ParticipantService } from '../../../services/ParticipantService';
import { TeamService } from '../../../services/TeamService';
import type { Participant, Team } from '../../../types/models';

export default function Certificates() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [certificates, setCertificates] = useState<CertificateMetadata[]>([]);
  const [isIssuing, setIsIssuing] = useState(false);
  
  // Search state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Issue Form
  const [ownerId, setOwnerId] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [type, setType] = useState<CertificateType>('Participant');

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkTarget, setBulkTarget] = useState('participants_approved');
  const [bulkType, setBulkType] = useState<CertificateType>('Participant');
  const [bulkEligible, setBulkEligible] = useState<{id: string, name: string}[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isIssuingBulk, setIsIssuingBulk] = useState(false);

  useEffect(() => {
    const unsubscribeCerts = CertificateService.subscribeToAllCertificates((data) => {
      setCertificates(data);
    });
    const unsubscribeParts = ParticipantService.subscribeToAllParticipants((data) => {
      setParticipants(data);
    });
    return () => {
      unsubscribeCerts();
      unsubscribeParts();
    };
  }, []);

  // Whenever modal opens or target changes, calculate preview
  useEffect(() => {
    if (bulkModalOpen) {
      calculateBulkPreview();
    }
  }, [bulkModalOpen, bulkTarget]);

  const calculateBulkPreview = async () => {
    setIsPreviewing(true);
    let eligible: {id: string, name: string}[] = [];
    if (bulkTarget === 'participants_approved') {
      eligible = participants.filter(p => p.status === 'approved').map(p => ({ id: p.id, name: p.fullName }));
    } else if (bulkTarget.startsWith('role_')) {
      const roleTarget = bulkTarget.replace('role_', '');
      try {
        eligible = participants.filter(p => p.role === roleTarget).map(p => ({ id: p.id, name: p.fullName }));
      } catch (e) {
        console.error(e);
      }
    }
    
    // Filter out people who already have this certificate type
    const finalEligible = eligible.filter(e => {
      return !certificates.some(c => c.ownerId === e.id && c.type === bulkType && c.status === 'Valid');
    });
    
    setBulkEligible(finalEligible);
    setIsPreviewing(false);
  };

  const executeBulkIssuance = async () => {
    if (!user) return;
    setIsIssuingBulk(true);
    let successCount = 0;
    for (const recipient of bulkEligible) {
      try {
        await CertificateService.issueCertificate({
          ownerId: recipient.id,
          ownerName: recipient.name,
          type: bulkType,
          issuedBy: user.uid
        });
        successCount++;
      } catch (err) {
        console.error("Failed for", recipient.name, err);
      }
    }
    success('Bulk Issuance Complete', `Successfully issued ${successCount} certificates.`);
    setIsIssuingBulk(false);
    setBulkModalOpen(false);
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId || !ownerName || !user) return;
    setIsIssuing(true);
    try {
      await CertificateService.issueCertificate({
        ownerId,
        ownerName,
        type,
        issuedBy: user.uid
      });
      success('Certificate Issued', `Successfully issued ${type} certificate to ${ownerName}.`);
      setOwnerId('');
      setOwnerName('');
      setSearchQuery('');
    } catch (err: any) {
      toastError('Issue Failed', err.message);
    } finally {
      setIsIssuing(false);
    }
  };

  const handleRevoke = async (certId: string) => {
    if (!user) return;
    try {
      await CertificateService.revokeCertificate(certId, user.uid);
      success('Certificate Revoked', 'The certificate is now invalid.');
    } catch (err: any) {
      toastError('Revoke Failed', err.message);
    }
  };

  const selectParticipant = (p: Participant) => {
    setOwnerId(p.id);
    setOwnerName(p.fullName);
    setSearchQuery('');
  };

  const filteredParticipants = participants
    .filter(p => 
      searchQuery && (
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.teamId && p.teamId.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    )
    .slice(0, 5); // show top 5

  const columns: Column<CertificateMetadata>[] = [
    {
      header: 'Certificate ID',
      accessorKey: 'certificateId',
      searchable: true,
      cell: (row) => <span className="font-mono text-primary text-xs break-all">{row.certificateId}</span>
    },
    {
      header: 'Recipient',
      accessorKey: 'ownerName',
      searchable: true,
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-inter text-sm text-white font-medium">{row.ownerName}</p>
          <p className="font-mono text-[10px] text-gray-500">{row.ownerId}</p>
        </div>
      )
    },
    {
      header: 'Type',
      accessorKey: 'type',
      sortable: true,
      cell: (row) => <Badge variant="outline">{row.type}</Badge>
    },
    {
      header: 'Issued Date',
      accessorKey: 'issuedDate',
      sortable: true,
      cell: (row) => <span className="font-mono text-xs text-gray-400">{new Date(row.issuedDate).toLocaleDateString()}</span>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (row) => {
        if (row.status === 'Valid') return <Badge variant="success">Valid</Badge>;
        if (row.status === 'Revoked') return <Badge variant="danger">Revoked</Badge>;
        return <Badge variant="warning">{row.status}</Badge>;
      }
    },
    {
      header: 'Actions',
      accessorKey: 'certificateId',
      cell: (row) => (
        row.status === 'Valid' && (
          <Button variant="ghost" size="sm" onClick={() => handleRevoke(row.certificateId)} className="text-red-400 hover:text-red-300">
            Revoke
          </Button>
        )
      )
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <Award className="w-8 h-8 text-primary" /> CERTIFICATES MANAGER
          </h2>
          <p className="font-inter text-gray-400">Issue verifable credentials and manage certificate validity.</p>
        </div>
        <div>
          <Button variant="primary" leftIcon={Wand2} onClick={() => setBulkModalOpen(true)}>BULK ISSUE WIZARD</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Issue Panel */}
        <Card className="lg:col-span-1 flex flex-col h-full max-h-[calc(100vh-250px)]">
          <div className="p-6 border-b border-white/10 shrink-0 bg-white/5">
            <h3 className="text-xl font-bebas tracking-widest text-white">ISSUE MANUALLY</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Search Box */}
            <div className="space-y-2 relative">
              <Label>Search Participant</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, email, team ID..."
                  className="pl-9"
                />
              </div>
              
              {searchQuery && filteredParticipants.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[#111] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                  {filteredParticipants.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectParticipant(p)}
                      className="w-full text-left p-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-inter text-sm text-white">{p.fullName}</span>
                        {p.status === 'active' ? <Badge variant="success">Active</Badge> : <Badge variant="warning">{p.status}</Badge>}
                      </div>
                      <div className="font-mono text-xs text-gray-500 mt-1">{p.email} | Team: {p.teamId || 'None'}</div>
                    </button>
                  ))}
                </div>
              )}
              {searchQuery && filteredParticipants.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[#111] border border-white/10 rounded-lg shadow-xl p-3 text-sm text-gray-500">
                  No matches found.
                </div>
              )}
            </div>

            <form onSubmit={handleIssue} className="space-y-4 pt-4 border-t border-white/10">
              <div>
                <Label>Recipient ID <span className="text-red-400">*</span></Label>
                <Input value={ownerId} onChange={(e) => setOwnerId(e.target.value)} required placeholder="Auth UID or Reg ID" readOnly={!!ownerId} className={ownerId ? 'opacity-70' : ''} />
              </div>
              <div>
                <Label>Full Name <span className="text-red-400">*</span></Label>
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required placeholder="e.g. Alice Hacker" />
              </div>
              <div>
                <Label>Certificate Type</Label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value as CertificateType)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50 font-inter text-sm"
                >
                  {(['Winner', 'RunnerUp', 'Participant', 'Volunteer', 'Judge', 'Mentor', 'Organizer', 'SpecialAward'] as CertificateType[]).map(t => (
                    <option key={t} className="bg-[#111]" value={t}>{t}</option>
                  ))}
                </select>
              </div>
              
              <div className="pt-2 flex gap-2">
                <Button type="submit" isLoading={isIssuing} leftIcon={Award} className="flex-1">ISSUE</Button>
                <Button type="button" variant="outline" onClick={() => { setOwnerId(''); setOwnerName(''); }} className="px-3 text-gray-400"><XCircle className="w-4 h-4" /></Button>
              </div>
            </form>

            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-xs font-inter text-primary">
              Manual issuance verifies eligibility. If the participant already has a valid certificate of this type, it will be blocked.
            </div>
          </div>
        </Card>

        {/* Directory */}
        <Card className="lg:col-span-2 flex flex-col h-full max-h-[calc(100vh-250px)]">
          <div className="flex-1 overflow-y-auto p-0">
            <DataTable 
              columns={columns} 
              data={certificates}
              searchable
              searchKey="certificateId"
              emptyMessage="No certificates issued yet."
            />
          </div>
        </Card>

      </div>

      <Modal isOpen={bulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Bulk Certificate Wizard" size="2xl">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Target Audience</Label>
              <select 
                value={bulkTarget} 
                onChange={e => setBulkTarget(e.target.value)} 
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white mt-1"
              >
                <option value="participants_approved">All Approved Participants</option>
                <option value="role_volunteer">All Volunteers</option>
                <option value="role_judge">All Judges</option>
                <option value="role_mentor">All Mentors</option>
                <option value="role_organizer">All Organizers</option>
              </select>
            </div>
            <div>
              <Label>Certificate Type</Label>
              <select 
                value={bulkType} 
                onChange={e => setBulkType(e.target.value as CertificateType)} 
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white mt-1"
              >
                {(['Winner', 'RunnerUp', 'Participant', 'Volunteer', 'Judge', 'Mentor', 'Organizer', 'SpecialAward'] as CertificateType[]).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <Label className="text-gray-400 mb-2">Preview Generation</Label>
            {isPreviewing ? (
              <div className="text-sm font-inter text-gray-300">Calculating...</div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-3xl font-bebas text-white mr-2">{bulkEligible.length}</span>
                  <span className="text-sm font-inter text-gray-400">eligible recipients found</span>
                </div>
                <Button onClick={calculateBulkPreview} variant="outline" size="sm">Refresh Preview</Button>
              </div>
            )}
          </div>

          <Button 
            className="w-full" 
            onClick={executeBulkIssuance} 
            disabled={bulkEligible.length === 0 || isIssuingBulk} 
            isLoading={isIssuingBulk}
          >
            ISSUE {bulkEligible.length} CERTIFICATES
          </Button>
        </div>
      </Modal>
    </div>
  );
}
