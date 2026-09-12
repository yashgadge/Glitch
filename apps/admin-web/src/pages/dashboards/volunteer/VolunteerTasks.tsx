import React from 'react';
import { Card } from '../../../components/ui/Card';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { motion } from 'framer-motion';

export default function VolunteerTasks() {
  const { user } = useAuth();

  // In a real implementation, you would fetch these from a TasksService.
  // We're stubbing it out for now as requested.
  const tasks = [
    { id: '1', title: 'Check classroom C-204', status: 'COMPLETED', time: '10:00 AM' },
    { id: '2', title: 'Assist Team GL36-T-00041', status: 'ACTIVE', time: '12:30 PM' },
    { id: '3', title: 'Food Desk Shift', status: 'UPCOMING', time: '2:00 PM' },
    { id: '4', title: 'Registration Desk Shift', status: 'UPCOMING', time: '4:00 PM' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h2 className="font-bebas text-4xl tracking-widest text-white">MY TASKS</h2>
        <p className="font-inter text-gray-400">View and manage your assigned operational tasks.</p>
      </div>

      <div className="space-y-4">
        {tasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={`p-5 border ${task.status === 'ACTIVE' ? 'border-primary/50 bg-primary/5' : task.status === 'COMPLETED' ? 'border-green-500/20 bg-green-500/5' : 'border-white/5 bg-black/20'} flex items-center justify-between`}>
              <div className="flex items-center gap-4">
                {task.status === 'COMPLETED' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : task.status === 'ACTIVE' ? (
                  <div className="relative">
                    <Circle className="w-6 h-6 text-primary absolute inset-0 animate-ping opacity-50" />
                    <Circle className="w-6 h-6 text-primary relative" />
                  </div>
                ) : (
                  <Clock className="w-6 h-6 text-gray-500" />
                )}
                
                <div>
                  <h4 className="font-bebas text-xl text-white tracking-wide">{task.title}</h4>
                  <p className="text-sm font-inter text-gray-400">Scheduled for {task.time}</p>
                </div>
              </div>

              <div className="text-right">
                <span className={`text-xs font-mono px-3 py-1 rounded-full ${
                  task.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                  task.status === 'ACTIVE' ? 'bg-primary/20 text-primary' :
                  'bg-white/10 text-gray-400'
                }`}>
                  {task.status}
                </span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
