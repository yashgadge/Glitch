import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Map, Users, CheckCircle2 } from 'lucide-react';
import { ClassroomService } from '@shared/services/ClassroomService';
import type { Classroom } from '@shared/types/models';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { motion } from 'framer-motion';

export default function VolunteerClassrooms() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = ClassroomService.subscribeToAllClassrooms((data) => {
      setClassrooms(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <Map className="w-8 h-8 text-primary" /> ALL CLASSROOMS
          </h2>
          <p className="font-inter text-gray-400">Overview of all active classrooms and their status.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : classrooms.length === 0 ? (
        <EmptyState 
          icon={Map}
          title="NO CLASSROOMS"
          description="No classrooms have been configured for the event yet."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map((cr, idx) => (
            <motion.div key={cr.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Card className="p-5 border-white/5 bg-black/20 hover:border-primary/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bebas text-2xl text-white">{cr.roomName}</h3>
                    <p className="text-xs font-inter text-gray-400 flex items-center gap-1 mt-1">
                      {cr.building}, Floor {cr.floor}
                    </p>
                  </div>
                  <Badge variant={cr.status === 'AVAILABLE' ? 'success' : cr.status === 'ASSIGNED' ? 'primary' : 'danger'}>
                    {cr.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                    <span className="text-[10px] text-gray-500 font-inter uppercase tracking-widest block mb-1">CAPACITY</span>
                    <span className="font-mono text-white text-lg flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" /> {cr.capacity}
                    </span>
                  </div>
                  <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                    <span className="text-[10px] text-gray-500 font-inter uppercase tracking-widest block mb-1">TEAMS INSIDE</span>
                    <span className="font-mono text-white text-lg flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" /> {cr.teamIds?.length || 0}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
