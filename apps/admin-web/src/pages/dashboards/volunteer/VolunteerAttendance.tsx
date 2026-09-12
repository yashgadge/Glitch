import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { useAuth } from '@shared/contexts/AuthContext';
import { AttendanceService } from '@shared/services/AttendanceService';
import type { ScanLog } from '@shared/types/models';
import { CheckCircle2, XCircle, User, Clock, MapPin, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';

export default function VolunteerAttendance() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [stats, setStats] = useState({ expected: 0, checkedIn: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState<'ALL' | 'SUCCESS' | 'REJECTED' | 'UNDO'>('ALL');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let unsub = () => {};
    
    const init = async () => {
      try {
        const s = await AttendanceService.fetchAttendanceStats();
        setStats(s);
      } catch (e) {
        console.error(e);
      }
      
      unsub = AttendanceService.subscribeToRecentScanLogs((recentLogs) => {
        setLogs(recentLogs);
        setLoading(false);
      }, 50); // get last 50 logs
    };
    
    init();

    return () => unsub();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto space-y-6 pb-20"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white">ATTENDANCE</h2>
          <p className="font-inter text-gray-400">View and manage participant check-ins</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search Participant ID, Location..."
            className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white font-inter text-sm focus:outline-none focus:border-primary transition-colors flex-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select 
            className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white font-inter text-sm focus:outline-none focus:border-primary"
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as any)}
          >
            <option value="ALL">ALL RESULTS</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="REJECTED">REJECTED</option>
            <option value="UNDO">UNDO</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-black/40 border-white/10 text-center">
          <p className="text-gray-500 font-bebas tracking-widest text-sm">EXPECTED</p>
          <p className="font-mono text-3xl text-white mt-1">{stats.expected}</p>
        </Card>
        <Card className="p-4 bg-green-900/20 border-green-500/20 text-center">
          <p className="text-green-500/70 font-bebas tracking-widest text-sm">CHECKED IN</p>
          <p className="font-mono text-3xl text-green-400 mt-1">{stats.checkedIn}</p>
        </Card>
        <Card className="p-4 bg-blue-900/20 border-blue-500/20 text-center">
          <p className="text-blue-500/70 font-bebas tracking-widest text-sm">PENDING</p>
          <p className="font-mono text-3xl text-blue-400 mt-1">{stats.pending}</p>
        </Card>
      </div>

      <Card className="p-6 min-h-[400px]">
        <h3 className="font-bebas text-2xl text-white mb-6 border-b border-white/10 pb-2">RECENT SCANS (LIVE)</h3>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : logs.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {logs
                .filter(log => resultFilter === 'ALL' || log.result.toUpperCase() === resultFilter)
                .filter(log => !searchQuery || log.participantId.toLowerCase().includes(searchQuery.toLowerCase()) || (log.location || '').toLowerCase().includes(searchQuery.toLowerCase()))
                .map(log => (
                <motion.div 
                  key={log.id} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-center gap-4">
                    {log.result === 'success' ? (
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                        <CheckCircle2 className="text-green-500 w-6 h-6" />
                      </div>
                    ) : log.result === 'rejected' ? (
                      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                        <XCircle className="text-red-500 w-6 h-6" />
                      </div>
                    ) : log.result === 'undo' ? (
                      <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                        <Clock className="text-orange-500 w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-500/20 flex items-center justify-center border border-gray-500/30">
                        <AlertCircle className="text-gray-500 w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-white font-bebas text-xl tracking-wide">{log.participantId}</h4>
                      <p className="text-gray-400 text-sm font-inter flex items-center gap-2 mt-1">
                        <MapPin className="w-3 h-3" /> {log.location || 'Main Gate'}
                        <span className="text-gray-600">|</span>
                        <User className="w-3 h-3" /> {log.scannerUser}
                      </p>
                      {log.reason && (
                        <p className="text-red-400/80 text-xs font-inter mt-1">{log.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <Badge variant={log.result === 'success' ? 'success' : log.result === 'rejected' ? 'danger' : 'outline'}>
                      {log.result.toUpperCase()}
                    </Badge>
                    <span className="text-gray-500 text-xs font-mono block">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    {log.result === 'success' && user && (
                      <button 
                        onClick={async () => {
                          if (!window.confirm(`Undo check-in for ${log.participantId}?`)) return;
                          setIsProcessing(true);
                          try {
                            await AttendanceService.undoCheckIn(log.participantId, (log as any).passId || '', (log as any).token || '', user.uid, user.uid);
                          } catch (e) {
                            alert('Failed to undo check-in');
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        disabled={isProcessing}
                        className="text-[10px] text-red-500 hover:text-red-400 uppercase font-bold tracking-wider mt-1 underline cursor-pointer"
                      >
                        UNDO
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState
            icon={Clock}
            title="NO RECENT SCANS"
            description="Live check-in records will appear here automatically."
          />
        )}
      </Card>
    </motion.div>
  );
}
