import React, { useState, useEffect } from 'react';
import { CheckSquare, Unlock, FileText, Search, ShieldAlert, FileBarChart, Save, Edit3, Settings } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Label } from '../../../components/ui/Form';
import { useToast } from '../../../components/ui/ToastContext';
import { EvaluationService, type CriterionTemplate } from '../../../services/EvaluationService';
import { AggregationService } from '../../../services/AggregationService';
import type { Evaluation, Team } from '../../../types/models';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Badge } from '../../../components/ui/Badge';
import { ConfirmationDialog } from '../../../components/ui/ConfirmationDialog';

export default function EvaluationManager() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  
  // Teams & Evaluations State
  const [teams, setTeams] = useState<Team[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [activeRound, setActiveRound] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<Evaluation | null>(null);

  // Criteria State
  const [criteria, setCriteria] = useState<CriterionTemplate[]>([]);
  const [isCriteriaLocked, setIsCriteriaLocked] = useState(false);
  const [isSavingCriteria, setIsSavingCriteria] = useState(false);

  useEffect(() => {
    // Fetch all active teams
    const q = query(collection(db, 'teams'), where('status', 'not-in', ['eliminated', 'disqualified']));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Team));
      setTeams(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Fetch criteria and lock status
    const unsub = EvaluationService.subscribeToCriteria((data) => {
      setCriteria(data);
    });
    
    EvaluationService.isCriteriaLocked().then(locked => {
      setIsCriteriaLocked(locked);
    });
    
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      setIsLoading(true);
      const roundId = Number(activeRound);
const unsub = EvaluationService.subscribeToTeamEvaluations(selectedTeam.id, roundId, (data) => {
        setEvaluations(data);
        setIsLoading(false);
      });
      return () => unsub();
    } else {
      setEvaluations([]);
    }
  }, [selectedTeam, activeRound]);

  const handleUnlock = async () => {
    if (!unlockTarget || !user) return;
    try {
      await EvaluationService.unlockEvaluation(unlockTarget.id, user.uid);
      success('Evaluation Unlocked', 'The judge can now edit this score sheet.');
      setUnlockTarget(null);
    } catch (err: any) {
      toastError('Failed to unlock evaluation', err.message);
    }
  };

  const handleAggregate = async () => {
    if (!selectedTeam) return;
    try {
      await AggregationService.generateResult(selectedTeam.id, Number(activeRound), user!.uid);
      success('Aggregation Complete', `Results for ${selectedTeam.name} have been updated.`);
    } catch (err: any) {
      toastError('Aggregation Failed', err.message);
    }
  };

  const handleUpdateCriteria = (index: number, field: keyof CriterionTemplate, value: any) => {
    if (isCriteriaLocked) return;
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    setCriteria(updated);
  };

  const handleSaveCriteria = async () => {
    if (isCriteriaLocked) return;
    
    // Validate duplicates
    const names = new Set();
    const orders = new Set();
    for (const c of criteria) {
      if (names.has(c.name.toLowerCase().trim())) {
        return toastError('Validation Failed', `Duplicate criteria name found: ${c.name}`);
      }
      if (orders.has(c.order)) {
        return toastError('Validation Failed', `Duplicate display order found: ${c.order}`);
      }
      names.add(c.name.toLowerCase().trim());
      orders.add(c.order);
    }

    setIsSavingCriteria(true);
    try {
      await EvaluationService.updateCriteria(criteria);
      success('Criteria Saved', 'Evaluation criteria updated successfully.');
    } catch (err: any) {
      toastError('Failed to save criteria', err.message);
    } finally {
      setIsSavingCriteria(false);
    }
  };

  const evalColumns: Column<Evaluation>[] = [
    {
      header: 'Judge ID',
      accessorKey: 'judgeId',
      cell: (row) => <span className="font-mono text-primary text-xs">{row.judgeId}</span>
    },
    {
      header: 'Total Score',
      accessorKey: 'totalScore',
      cell: (row) => <span className="font-bebas text-xl text-white">{row.totalScore}</span>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => {
        if (row.locked) return <Badge variant="danger">Locked</Badge>;
        if (row.status === 'submitted') return <Badge variant="success">Submitted</Badge>;
        return <Badge variant="warning">Draft</Badge>;
      }
    },
    {
      header: 'Last Updated',
      accessorKey: 'timestamp',
      cell: (row) => <span className="text-xs text-gray-500 font-inter">{new Date(row.timestamp).toLocaleString()}</span>
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (row) => (
        <div className="flex gap-2">
          {row.locked && (
            <Button variant="outline" size="sm" onClick={() => setUnlockTarget(row)} leftIcon={Unlock}>
              Unlock
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-primary" /> EVALUATION MANAGER
          </h2>
          <p className="font-inter text-gray-400">Manage criteria, monitor judge progress and unlock sealed scorecards.</p>
        </div>
        <div className="flex gap-3">
           <Input 
             type="number" 
             value={activeRound} 
             onChange={(e) => setActiveRound(Number(e.target.value))} 
             className="w-24 text-center" 
             title="Round ID"
           />
        </div>
      </div>

      {/* Criteria Configuration Panel */}
      <Card>
        <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-white" />
            <h3 className="font-bebas text-xl text-white tracking-widest">CRITERIA CONFIGURATION</h3>
          </div>
          <Button 
            variant="primary" 
            size="sm" 
            leftIcon={Save} 
            onClick={handleSaveCriteria}
            isLoading={isSavingCriteria}
            disabled={isCriteriaLocked}
          >
            Save Criteria
          </Button>
        </div>
        <CardContent className="p-6">
          {isCriteriaLocked && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-yellow-500 font-inter mb-1">Evaluation Criteria Locked</h4>
                <p className="text-sm text-yellow-500/80 font-inter">
                  Evaluation criteria are locked because scoring has already begun. You can no longer modify criteria definitions to preserve scoring integrity.
                </p>
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#111] border-b border-white/10 text-xs text-gray-400 uppercase font-inter tracking-wider">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3 w-1/3">Criterion Name</th>
                  <th className="px-4 py-3">Max Score</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {criteria.map((c, index) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={c.order}
                        onChange={(e) => handleUpdateCriteria(index, 'order', Number(e.target.value))}
                        disabled={isCriteriaLocked}
                        className="w-20"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        value={c.name}
                        onChange={(e) => handleUpdateCriteria(index, 'name', e.target.value)}
                        disabled={isCriteriaLocked}
                        className="w-full"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={c.maxScore}
                        onChange={(e) => handleUpdateCriteria(index, 'maxScore', Number(e.target.value))}
                        disabled={isCriteriaLocked}
                        className="w-24"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={c.enabled ? 'true' : 'false'}
                        onChange={(e) => handleUpdateCriteria(index, 'enabled', e.target.value === 'true')}
                        disabled={isCriteriaLocked}
                        className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50 font-inter text-sm disabled:opacity-50"
                      >
                        <option value="true" className="bg-[#111]">Enabled</option>
                        <option value="false" className="bg-[#111]">Disabled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Teams List */}
        <Card className="lg:col-span-1 flex flex-col h-full max-h-[calc(100vh-250px)]">
          <div className="p-4 border-b border-white/10 bg-white/5">
            <h3 className="font-bebas text-xl text-white tracking-widest">SELECT TEAM</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {teams.map(team => (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                className={`w-full text-left p-3 rounded-lg transition-colors flex flex-col gap-1 ${
                  selectedTeam?.id === team.id ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                   <span className="text-sm font-medium text-white font-inter truncate">{team.name}</span>
                   <span className="text-[10px] uppercase font-mono text-gray-500">{team.id}</span>
                </div>
                <div className="text-xs text-primary font-mono truncate">{team.track}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Evaluation Board */}
        <Card className="lg:col-span-2 flex flex-col h-full max-h-[calc(100vh-250px)]">
          {!selectedTeam ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
              <FileText className="w-12 h-12 mb-4 opacity-50" />
              <p className="font-inter">Select a team to view their evaluations for Round {activeRound}.</p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-white/10 shrink-0 flex justify-between items-center bg-white/5">
                <div>
                  <h3 className="text-2xl font-bebas tracking-wider text-white">{selectedTeam.name}</h3>
                  <p className="text-sm text-gray-400 font-inter">Evaluations • Round {activeRound}</p>
                </div>
                <Button variant="primary" leftIcon={FileBarChart} onClick={handleAggregate}>
                  Force Aggregate
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-0">
                <DataTable 
                  columns={evalColumns} 
                  data={evaluations}
                  emptyMessage={isLoading ? "Loading..." : "No evaluations submitted for this team yet."}
                />
              </div>
            </>
          )}
        </Card>

      </div>

      <ConfirmationDialog
        isOpen={!!unlockTarget}
        onClose={() => setUnlockTarget(null)}
        onConfirm={handleUnlock}
        title="Unlock Evaluation"
        message={<>Are you sure you want to unlock this evaluation? The judge (<span className="text-white">{unlockTarget?.judgeId}</span>) will be able to modify their submitted scores.</>}
        confirmText="Yes, Unlock"
        variant="warning"
      />
    </div>
  );
}
