import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { AuditService } from '@shared/services/AuditService';
import type { AuditLog as AuditLogModel } from '@shared/types/models';

export default function AuditLog() {
  const [auditData, setAuditData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = AuditService.subscribeToAllLogs((logs) => {
      const formatted = logs.map(log => ({
        id: log.id,
        action: log.action,
        entity: `${log.resourceType}: ${log.targetId}`,
        user: log.actorId,
        timestamp: log.timestamp,
        severity: log.action.includes('DELETE') || log.action.includes('ELIMINATE') || log.action.includes('DISQUALIFY') || log.action.includes('REVOKE') ? 'danger' :
                  log.action.includes('UPDATE') || log.action.includes('LOCKED') || log.action.includes('BLOCK') ? 'warning' : 'info'
      }));
      setAuditData(formatted);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const columns: Column<any>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      sortable: true,
      cell: (row) => <span className="font-mono text-xs text-gray-400">{new Date(row.timestamp).toLocaleString()}</span>
    },
    {
      header: 'Action',
      accessorKey: 'action',
      sortable: true,
      cell: (row) => (
        <Badge variant={row.severity === 'danger' ? 'danger' : (row.severity === 'warning' ? 'warning' : 'outline')}>
          {row.action}
        </Badge>
      )
    },
    {
      header: 'Entity Affected',
      accessorKey: 'entity',
      sortable: true,
      cell: (row) => <span className="font-inter text-sm text-gray-300">{row.entity}</span>
    },
    {
      header: 'Performed By',
      accessorKey: 'user',
      sortable: true,
      cell: (row) => <span className="font-inter text-sm text-white">{row.user}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-primary" /> SYSTEM AUDIT LOG
          </h1>
          <p className="font-inter text-gray-400">Immutable record of all organizer and admin actions.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">EXPORT LOGS</Button>
        </div>
      </div>

      <Card className="border-red-500/20">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 font-inter">Loading audit logs...</div>
          ) : (
            <DataTable 
              data={auditData} 
              columns={columns} 
              searchPlaceholder="Search by action, user, or entity..."
              searchable
              pagination
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

