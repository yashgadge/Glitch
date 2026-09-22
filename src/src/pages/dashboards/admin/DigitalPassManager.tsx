import React, { useState, useEffect } from 'react';
import { QrCode, ShieldAlert, CheckCircle2, XCircle, RefreshCw, Ban } from 'lucide-react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Card } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/ToastContext';
import { DigitalPassService } from '../../../services/DigitalPassService';
import type { DigitalPass, ScanLog } from '../../../types/models';
import { useAuth } from '../../../contexts/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function DigitalPassManager() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [passes, setPasses] = useState<DigitalPass[]>([]);
  const [totalScans, setTotalScans] = useState(0);

  useEffect(() => {
    const unsubPasses = onSnapshot(query(collection(db, 'digitalPasses')), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DigitalPass));
      setPasses(data);
    });
    
    const unsubScans = onSnapshot(query(collection(db, 'scanLogs')), (snapshot) => {
      setTotalScans(snapshot.docs.length);
    });

    return () => {
      unsubPasses();
      unsubScans();
    };
  }, []);

  const handleRevoke = async (passId: string) => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to PERMANENTLY revoke this pass?")) return;
    try {
      const functions = getFunctions();
      const revokeDigitalPass = httpsCallable(functions, 'revokeDigitalPass');
      await revokeDigitalPass({ passId });
      success('Pass Revoked', 'The digital pass is permanently revoked.');
    } catch (err: any) {
      toastError('Revocation Failed', err.message);
    }
  };

  const handleBlock = async (passId: string) => {
    if (!user) return;
    const reason = window.prompt("Reason for blocking this pass:");
    if (!reason) return;
    try {
      await DigitalPassService.blockPass(passId, reason, user.uid);
      success('Pass Blocked', 'The digital pass is temporarily blocked.');
    } catch (err: any) {
      toastError('Block Failed', err.message);
    }
  };

  const handleReissue = async (passId: string) => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to reissue this pass? The old QR will become invalid.")) return;
    try {
      const functions = getFunctions();
      const reissueDigitalPass = httpsCallable(functions, 'reissueDigitalPass');
      await reissueDigitalPass({ passId });
      success('Pass Reissued', 'A new secure token has been generated.');
    } catch (err: any) {
      toastError('Reissue Failed', err.message);
    }
  };

  const handleRestore = async (passId: string) => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to restore this pass to active status?")) return;
    try {
      await DigitalPassService.restorePass(passId, user.uid);
      success('Pass Restored', 'The digital pass is now active again.');
    } catch (err: any) {
      toastError('Restore Failed', err.message);
    }
  };

  const columns: Column<DigitalPass>[] = [
    {
      header: 'Participant ID',
      accessorKey: 'participantId',
      searchable: true,
      sortable: true,
      cell: (row) => <span className="font-mono text-white text-sm">{row.participantId}</span>
    },
    {
      header: 'Secure Token',
      accessorKey: 'token',
      cell: (row) => <span className="font-mono text-gray-500 text-xs truncate max-w-[150px] inline-block">{row.token}</span>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (row) => {
        switch (row.status) {
          case 'active': return <Badge variant="success">ACTIVE</Badge>;
          case 'revoked': return <Badge variant="danger">REVOKED</Badge>;
          case 'blocked': return <Badge variant="warning">BLOCKED</Badge>;
          case 'reissued': return <Badge variant="outline">REISSUED</Badge>;
          default: return <Badge variant="outline">{row.status.toUpperCase()}</Badge>;
        }
      }
    },
    {
      header: 'Reissues',
      accessorKey: 'reissueCount',
      cell: (row) => <span className="font-inter text-gray-400 text-sm">{row.reissueCount || 0}</span>
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (row) => (
        <div className="flex gap-2">
          {row.status === 'active' && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleBlock(row.id)} className="text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10">
                <Ban className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleReissue(row.id)} className="text-primary border-primary/30 hover:bg-primary/10">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleRevoke(row.id)} className="text-red-400 border-red-400/30 hover:bg-red-400/10">
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}
          {(row.status === 'blocked' || row.status === 'revoked') && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleReissue(row.id)} className="text-primary border-primary/30 hover:bg-primary/10">
                Reissue
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleRestore(row.id)} className="text-green-400 border-green-400/30 hover:bg-green-400/10">
                Restore
              </Button>
            </>
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
            <QrCode className="w-8 h-8 text-primary" /> DIGITAL PASS MANAGER
          </h2>
          <p className="font-inter text-gray-400">Monitor secure tokens, manage pass lifecycles, and revoke access.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-primary border-primary/30 hover:bg-primary/10" leftIcon={RefreshCw} onClick={async () => {
            if (!user) return;
            if (!window.confirm("Are you sure you want to regenerate ALL active passes? This will invalidate all existing printed or downloaded passes.")) return;
            const activePasses = passes.filter(p => p.status === 'active');
            let successCount = 0;
            for (const p of activePasses) {
              try {
                await DigitalPassService.reissuePass(p.id, user.uid);
                successCount++;
              } catch (e) {
                console.error(e);
              }
            }
            success('Bulk Regeneration Complete', `Successfully reissued ${successCount} out of ${activePasses.length} active passes.`);
          }}>
            Bulk Regenerate Active Passes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-green-500/10 rounded-full">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-inter uppercase">Active Passes</p>
              <h3 className="text-3xl font-bebas text-white">{passes.filter(p => p.status === 'active').length}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-red-500/10 rounded-full">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-inter uppercase">Revoked/Blocked</p>
              <h3 className="text-3xl font-bebas text-white">{passes.filter(p => p.status === 'revoked' || p.status === 'blocked').length}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <ShieldAlert className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-inter uppercase">Total Scans</p>
              <h3 className="text-3xl font-bebas text-white">{totalScans}</h3>
            </div>
          </div>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          <DataTable 
            columns={columns} 
            data={passes}
            searchable
            searchKey="participantId"
            emptyMessage="No digital passes issued yet."
          />
        </div>
      </Card>
    </div>
  );
}
