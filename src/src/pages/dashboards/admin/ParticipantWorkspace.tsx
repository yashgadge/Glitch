import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ParticipantService } from '../../../services/ParticipantService';
import { TeamService } from '../../../services/TeamService';
import { DigitalPassService } from '../../../services/DigitalPassService';
import { AttendanceService } from '../../../services/AttendanceService';
import { CertificateService } from '../../../lib/CertificateService';
import { AuditService } from '../../../services/AuditService';
import { executeServiceMethod, executeSyncServiceMethod } from '../../../lib/ServiceGuard';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../../lib/firebase'; // Ensure initialized firebase app is imported if needed
import type { Participant, Team, DigitalPass, AttendanceRecord, AuditLog } from '../../../types/models';
import type { CertificateMetadata } from '../../../lib/CertificateService';
import { 
  ArrowLeft, CheckCircle2, XCircle, Award, 
  QrCode, User, Users, ClipboardList, ShieldAlert,
  CalendarDays, Play, Download, X, History,
  RefreshCcw, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { useToast } from '../../../components/ui/ToastContext';

export default function ParticipantWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [participant, setParticipant] = useState<Participant | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [pass, setPass] = useState<DigitalPass | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [certificates, setCertificates] = useState<CertificateMetadata[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let unsubParticipant: () => void;
    let unsubPass: () => void;
    let unsubAttendance: () => void;
    let unsubCertificates: () => void;
    let unsubLogs: () => void;

    const initialize = async () => {
      try {
        setLoading(true);
        const p = await executeServiceMethod(ParticipantService, 'getParticipant', [id]);
        setParticipant(p);

        if (p?.teamId) {
          const t = await executeServiceMethod(TeamService, 'getTeam', [p.teamId]);
          setTeam(t);
        }

        unsubPass = executeSyncServiceMethod(DigitalPassService, 'subscribeToPass', [id, (d: any) => setPass(d)], () => {});
        unsubAttendance = executeSyncServiceMethod(AttendanceService, 'subscribeToParticipantAttendance', [id, (d: any) => setAttendance(d)], () => {});
        unsubCertificates = executeSyncServiceMethod(CertificateService, 'subscribeToCertificates', [id, (d: any) => setCertificates(d)], () => {});
        unsubLogs = executeSyncServiceMethod(AuditService, 'getLogsForTarget', [id, (d: any) => setLogs(d)], () => {});
      } catch (err) {
        console.error("Workspace initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    initialize();

    return () => {
      unsubParticipant?.();
      unsubPass?.();
      unsubAttendance?.();
      unsubCertificates?.();
      unsubLogs?.();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold text-white">Participant Not Found</h2>
        <Button onClick={() => navigate('/workspace/participants')}>Return to Directory</Button>
      </div>
    );
  }

  // Action Handlers
  const handleGeneratePass = async () => {
    if (pass) return;
    try {
      const functions = getFunctions();
      const generateDigitalPass = httpsCallable(functions, 'generateDigitalPass');
      await generateDigitalPass({ participantId: id });
      addToast('success', 'Success', 'Digital pass generated successfully.');
    } catch (e: any) {
      addToast('error', 'Error', e.message || 'Failed to generate pass.');
    }
  };

  const handleReissuePass = async () => {
    if (!pass) return;
    try {
      const functions = getFunctions();
      const reissueDigitalPass = httpsCallable(functions, 'reissueDigitalPass');
      await reissueDigitalPass({ passId: pass.id });
      addToast('success', 'Success', 'Digital pass reissued successfully.');
    } catch (e: any) {
      addToast('error', 'Error', e.message || 'Failed to reissue pass.');
    }
  };

  const handleRevokePass = async () => {
    if (!pass) return;
    try {
      const functions = getFunctions();
      const revokeDigitalPass = httpsCallable(functions, 'revokeDigitalPass');
      await revokeDigitalPass({ passId: pass.id });
      addToast('success', 'Success', 'Digital pass revoked.');
    } catch (e: any) {
      addToast('error', 'Error', e.message || 'Failed to revoke pass.');
    }
  };

  const handleGenerateCertificate = async () => {
    try {
      const functions = getFunctions();
      const generateCertificateFn = httpsCallable(functions, 'generateCertificate');
      await generateCertificateFn({
        participantId: id,
        name: participant.name,
        type: 'participation',
        teamName: team?.name || '',
        track: participant.track || 'General'
      });
      addToast('success', 'Success', 'Certificate generated.');
    } catch (e: any) {
      addToast('error', 'Error', e.message || 'Failed to generate certificate.');
    }
  };

  const hasCheckedIn = attendance.some(a => a.type === 'check_in');

  return (
    <div className="space-y-6">
      {/* Participant Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/workspace/participants')} className="mr-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl border border-primary/30">
            {participant.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-bebas text-3xl tracking-wide text-white">{participant.name}</h1>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge variant="outline" className="font-mono">{participant.participantId || participant.id}</Badge>
              <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">{participant.track || 'Unassigned Track'}</Badge>
              {team && <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">Team: {team.name}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-400 font-mono mb-1">CURRENT STATUS</div>
            <Badge variant={participant.status === 'approved' ? 'default' : 'outline'} className={participant.status === 'approved' ? 'bg-green-500/20 text-green-500 border-green-500/50' : ''}>
              {(participant.status || 'unknown').toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-black/40 border-white/5">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <QrCode className={`w-6 h-6 mb-2 ${pass?.status === 'active' ? 'text-green-500' : 'text-gray-500'}`} />
            <div className="text-[10px] text-gray-500 font-mono">DIGITAL PASS</div>
            <div className="font-bold text-sm text-white mt-1">{pass?.status?.toUpperCase() || 'NOT ISSUED'}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-black/40 border-white/5">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className={`w-6 h-6 mb-2 ${hasCheckedIn ? 'text-green-500' : 'text-yellow-500'}`} />
            <div className="text-[10px] text-gray-500 font-mono">ATTENDANCE</div>
            <div className="font-bold text-sm text-white mt-1">{hasCheckedIn ? 'CHECKED IN' : 'PENDING'}</div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/5">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Award className={`w-6 h-6 mb-2 ${certificates.length > 0 ? 'text-primary' : 'text-gray-500'}`} />
            <div className="text-[10px] text-gray-500 font-mono">CERTIFICATES</div>
            <div className="font-bold text-sm text-white mt-1">{certificates.length} ISSUED</div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/5">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <ClipboardList className="w-6 h-6 mb-2 text-blue-500" />
            <div className="text-[10px] text-gray-500 font-mono">SUBMISSIONS</div>
            <div className="font-bold text-sm text-white mt-1">N/A</div>
          </CardContent>
        </Card>
      </div>

      {/* Operations Toolbar */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm font-bold text-primary mr-4 font-bebas tracking-wider">OPERATIONS</div>
            {!pass && (
              <Button size="sm" variant="outline" className="text-xs text-green-400 hover:text-green-300 border-green-500/30" onClick={handleGeneratePass}>
                <QrCode className="w-3 h-3 mr-2" /> Generate Pass
              </Button>
            )}
            {pass && (
              <>
                <Button size="sm" variant="outline" className="text-xs" onClick={handleReissuePass}>
                  <RefreshCcw className="w-3 h-3 mr-2" /> Reissue Pass
                </Button>
                <Button size="sm" variant="outline" className="text-xs text-red-400 hover:text-red-300 border-red-500/30" onClick={handleRevokePass}>
                  <ShieldAlert className="w-3 h-3 mr-2" /> Revoke Pass
                </Button>
              </>
            )}
            <div className="w-px h-6 bg-white/10 mx-2"></div>
            <Button size="sm" variant="outline" className="text-xs" onClick={handleGenerateCertificate}>
              <Award className="w-3 h-3 mr-2" /> Generate Certificate
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Collapsible Sections */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div>
                  <span className="text-gray-500 block text-xs">Email</span>
                  <span className="text-white">{participant.email}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Phone</span>
                  <span className="text-white">{participant.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">College</span>
                  <span className="text-white">{participant.college || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Registered On</span>
                  <span className="text-white">{new Date(participant.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><QrCode className="w-4 h-4" /> Digital Pass Data</CardTitle>
            </CardHeader>
            <CardContent>
              {pass ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-500">Token ID</span>
                    <span className="font-mono text-white">{pass.token}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-500">Version</span>
                    <span className="font-mono text-white">v{pass.version}</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-gray-500">Scan Count</span>
                    <span className="font-mono text-white">{pass.scanCount || 0}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 text-sm">No Digital Pass found.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Operational Timeline */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="w-4 h-4" /> Operational Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-4 border-l border-white/10 space-y-6 before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0">
                {logs.length > 0 ? logs.map((log) => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-[21px] bg-black border border-white/20 w-2.5 h-2.5 rounded-full mt-1.5" />
                    <div className="text-xs text-primary font-mono mb-1">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div className="text-sm text-white font-medium">{log.action.replace(/_/g, ' ')}</div>
                    {log.details && (
                      <div className="text-xs text-gray-400 mt-1">{log.details}</div>
                    )}
                  </div>
                )) : (
                  <div className="text-xs text-gray-500 py-4 text-center">No history found.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
