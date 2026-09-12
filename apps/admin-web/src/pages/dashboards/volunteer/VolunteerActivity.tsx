import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { History, ScanLine, Package, User, Clock } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@shared/lib/firebase';
import type { ScanLog, RedemptionRecord } from '@shared/types/models';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';

type ActivityItem = 
  | { type: 'scan', timestamp: number, data: ScanLog }
  | { type: 'redemption', timestamp: number, data: RedemptionRecord };

export default function VolunteerActivity() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let scanLogs: ActivityItem[] = [];
    let redemptions: ActivityItem[] = [];

    const updateTimeline = () => {
      const merged = [...scanLogs, ...redemptions].sort((a, b) => b.timestamp - a.timestamp);
      setActivities(merged);
      setLoading(false);
    };

    const qScans = query(
      collection(db, 'scanLogs'),
      where('volunteerId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubScans = onSnapshot(qScans, (snap) => {
      scanLogs = snap.docs.map(doc => {
        const data = doc.data() as ScanLog;
        return { type: 'scan', timestamp: new Date(data.timestamp).getTime(), data: { ...data, id: doc.id } };
      });
      updateTimeline();
    });

    const qRedemptions = query(
      collection(db, 'redemptionRecords'),
      where('volunteerUid', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubRedemptions = onSnapshot(qRedemptions, (snap) => {
      redemptions = snap.docs.map(doc => {
        const data = doc.data() as RedemptionRecord;
        return { type: 'redemption', timestamp: new Date(data.timestamp).getTime(), data: { ...data, id: doc.id } };
      });
      updateTimeline();
    });

    return () => {
      unsubScans();
      unsubRedemptions();
    };
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-end border-b border-white/10 pb-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <History className="w-8 h-8 text-primary" /> MY ACTIVITY LOG
          </h2>
          <p className="font-inter text-gray-400">A timeline of all your field operations today.</p>
        </div>
      </div>

      <Card className="p-6 bg-black/20 border-white/5 min-h-[400px]">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : activities.length === 0 ? (
          <EmptyState 
            icon={Clock} 
            title="NO RECENT ACTIVITY" 
            description="Your check-ins, scans, and redemptions will appear here." 
          />
        ) : (
          <div className="relative border-l border-white/10 ml-4 space-y-8 pb-8">
            <AnimatePresence>
              {activities.map((item, idx) => (
                <motion.div 
                  key={`${item.type}-${item.type === 'scan' ? item.data.id : item.data.id}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative pl-8"
                >
                  <div className="absolute -left-4 top-1 w-8 h-8 rounded-full bg-black border border-white/20 flex items-center justify-center z-10">
                    {item.type === 'scan' ? (
                      <ScanLine className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Package className="w-4 h-4 text-orange-400" />
                    )}
                  </div>
                  
                  <div className="bg-white/5 border border-white/10 p-4 rounded-lg hover:border-white/20 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={item.type === 'scan' ? 'border-blue-500/30 text-blue-400' : 'border-orange-500/30 text-orange-400'}>
                          {item.type.toUpperCase()}
                        </Badge>
                        <span className="font-mono text-xs text-gray-500">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      
                      {item.type === 'scan' && (
                        <Badge variant={item.data.result === 'success' ? 'success' : item.data.result === 'rejected' ? 'danger' : 'outline'}>
                          {item.data.result.toUpperCase()}
                        </Badge>
                      )}
                      {item.type === 'redemption' && (
                        <Badge variant={item.data.status === 'redeemed' ? 'success' : 'danger'}>
                          {item.data.status.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    
                    {item.type === 'scan' ? (
                      <div>
                        <p className="font-inter text-white">Scanned Participant: <span className="font-mono text-primary">{item.data.participantId}</span></p>
                        <p className="text-sm text-gray-400 mt-1">Location: {item.data.location}</p>
                        {item.data.reason && <p className="text-sm text-red-400 mt-1">Reason: {item.data.reason}</p>}
                      </div>
                    ) : (
                      <div>
                        <p className="font-inter text-white">Redeemed <span className="font-bebas text-lg tracking-wider text-orange-400">{item.data.quantity}x {item.data.productId}</span></p>
                        <p className="text-sm text-gray-400 mt-1">Participant: <span className="font-mono">{item.data.participantId}</span></p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>
    </div>
  );
}
