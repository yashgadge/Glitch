import React from 'react';
import type { Staff } from '@shared/types/models';

interface JudgeWorkloadDashboardProps {
  judges: Staff[];
  workloads: Record<string, number>;
  capacityPerJudge?: number;
}

export function JudgeWorkloadDashboard({ judges, workloads, capacityPerJudge = 15 }: JudgeWorkloadDashboardProps) {
  // Sort judges by workload (highest first), then by name
  const sortedJudges = [...judges].sort((a, b) => {
    const loadA = workloads[a.id] || 0;
    const loadB = workloads[b.id] || 0;
    if (loadA !== loadB) return loadB - loadA;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="bg-black/30 border border-white/5 rounded-lg p-4 max-h-64 overflow-y-auto">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Judge Workload Dashboard</h3>
      <div className="space-y-3">
        {sortedJudges.length === 0 ? (
          <div className="text-sm text-gray-500">No judges available.</div>
        ) : (
          sortedJudges.map(judge => {
            const load = workloads[judge.id] || 0;
            const percentage = Math.min((load / capacityPerJudge) * 100, 100);
            
            // Determine color based on workload
            let barColor = "bg-primary";
            if (load > capacityPerJudge) barColor = "bg-red-500";
            else if (load === 0) barColor = "bg-gray-600";
            else if (percentage > 80) barColor = "bg-yellow-500";
            
            return (
              <div key={judge.id} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white truncate pr-2">{judge.name}</span>
                  <span className="text-gray-400 font-mono shrink-0">{load} / {capacityPerJudge}</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${barColor} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
