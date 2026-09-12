import React, { useState, useEffect } from 'react';
import { Trophy, Calculator, Eye, EyeOff, Download, RefreshCw, BarChart } from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs, doc } from 'firebase/firestore';
import { db } from '@shared/lib/firebase';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Form';
import { useToast } from '../../../components/ui/ToastContext';
import { useAuth } from '@shared/contexts/AuthContext';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Badge } from '../../../components/ui/Badge';
import { AggregationService } from '@shared/services/AggregationService';
import { RankingService } from '@shared/services/RankingService';
import { ResultsService } from '@shared/services/ResultsService';
import { TeamService } from '@shared/services/TeamService';
import { RoundService } from '@shared/services/RoundService';
import type { Result, Ranking, Team, Round } from '@shared/types/models';
import { guardValue } from '@shared/lib/firestoreGuard';

export default function ResultsManager() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [activeRound, setActiveRound] = useState<number>(1);
  const [results, setResults] = useState<(Result & { rank?: number, qualified?: boolean })[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qualificationThreshold, setQualificationThreshold] = useState<number>(10);
  const [versions, setVersions] = useState<number[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roundDoc, setRoundDoc] = useState<Round | null>(null);

  useEffect(() => {
    const unsub = TeamService.subscribeToAllTeams(setTeams);
    return unsub;
  }, []);

  useEffect(() => {
    // We need both results and rankings to build a complete view
    const roundId = Number(activeRound);
    const validRoundId = guardValue(roundId, 'roundId');
    const resQ = query(collection(db, 'results'), where('roundId', '==', validRoundId));
    const rankQ = query(collection(db, 'rankings'), where('roundId', '==', validRoundId));

    let localResults: Result[] = [];
    let localRankings: Ranking[] = [];

    const buildView = () => {
      const merged = localResults.map(res => {
        const rank = localRankings.find(r => r.teamId === res.teamId);
        return {
          ...res,
          rank: rank?.rank,
          qualified: rank?.qualified
        };
      });
      // Sort by round average descending
      merged.sort((a, b) => b.roundAverage - a.roundAverage);
      setResults(merged);
    };

    const unsubRes = onSnapshot(resQ, (snap) => {
      localResults = snap.docs.map(d => ({ id: d.id, ...d.data() } as Result));
      buildView();
    });

    const unsubRank = onSnapshot(query(collection(db, 'rankingSnapshots'), where('roundId', '==', validRoundId)), (snap) => {
      const allSnaps = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      const vSet = new Set<number>();
      allSnaps.forEach(s => vSet.add(s.rankingVersion));
      const sortedVersions = Array.from(vSet).sort((a, b) => b - a);
      setVersions(sortedVersions);
      
      const targetVersion = selectedVersion || sortedVersions[0];
      if (targetVersion && !selectedVersion) {
        setSelectedVersion(targetVersion);
      }
      
      if (targetVersion) {
        localRankings = allSnaps.filter(s => s.rankingVersion === targetVersion);
        buildView();
      }
    });

    const unsubRound = onSnapshot(doc(db, 'rounds', String(activeRound)), (docSnap) => {
      if (docSnap.exists()) {
        setRoundDoc({ id: docSnap.id, ...docSnap.data() } as Round);
      } else {
        setRoundDoc(null);
      }
    });

    return () => {
      unsubRes();
      unsubRank();
      unsubRound();
    };
  }, [activeRound, selectedVersion]);

  const handleGenerateResults = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      // Get all active teams
      const q = query(collection(db, 'teams'), where('status', 'not-in', ['eliminated', 'disqualified']));
      const snap = await getDocs(q);
      const teams = snap.docs.map(d => d.id);
      
      let successCount = 0;
      let failCount = 0;

      for (const teamId of teams) {
        try {
          const roundId = Number(activeRound);
          await AggregationService.generateResult(teamId, roundId, user.uid);
          successCount++;
        } catch (e) {
          // Ignore teams without locked evaluations
          failCount++;
        }
      }

      success('Results Generated', `Aggregated ${successCount} teams. Skipped ${failCount} (no locked evals).`);
    } catch (err: any) {
      toastError('Aggregation Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateRankings = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await RankingService.generateRankings(activeRound, qualificationThreshold, user.uid);
      setSelectedVersion(null); // Auto-select newest version
      success('Rankings Generated', 'Teams have been ranked based on their results.');
    } catch (err: any) {
      toastError('Ranking Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublishAll = async () => {
    if (!user) return;
    if (!selectedVersion) {
      toastError('Missing Ranking Snapshot', 'You must generate rankings first before publishing.');
      return;
    }
    
    setIsProcessing(true);
    try {
      for (const result of results) {
        if (!result.published) {
          await ResultsService.publishResult(result.id);
        }
      }
      await RankingService.publishSnapshot(activeRound, selectedVersion, user!.uid);
      success('Published', `Snapshot v${selectedVersion} is now visible to participants.`);
    } catch (err: any) {
      toastError('Publish Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnpublishAll = async () => {
    setIsProcessing(true);
    try {
      for (const result of results) {
        if (result.published) {
          await ResultsService.unpublishResult(result.id);
        }
      }
      success('Unpublished', 'Results are hidden from participants.');
    } catch (err: any) {
      toastError('Unpublish Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleLeaderboard = async () => {
    if (!roundDoc) return;
    setIsProcessing(true);
    try {
      await RoundService.updateRound(roundDoc.id, { showLeaderboard: !roundDoc.showLeaderboard });
      success('Updated', `Global Leaderboard is now ${!roundDoc.showLeaderboard ? 'Visible' : 'Hidden'} for Round ${activeRound}.`);
    } catch (err: any) {
      toastError('Update Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleScorecard = async () => {
    if (!roundDoc) return;
    setIsProcessing(true);
    try {
      const newVal = roundDoc.showScorecard !== false ? false : true;
      await RoundService.updateRound(roundDoc.id, { showScorecard: newVal });
      success('Updated', `Overall Score is now ${newVal ? 'Visible' : 'Hidden'} for Round ${activeRound}.`);
    } catch (err: any) {
      toastError('Update Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleCriteria = async () => {
    if (!roundDoc) return;
    setIsProcessing(true);
    try {
      const newVal = roundDoc.showCriteria !== false ? false : true;
      await RoundService.updateRound(roundDoc.id, { showCriteria: newVal });
      success('Updated', `Criteria Breakdown is now ${newVal ? 'Visible' : 'Hidden'} for Round ${activeRound}.`);
    } catch (err: any) {
      toastError('Update Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOverrideQualification = async (teamId: string, qualified: boolean) => {
    if (!selectedVersion || !user) return;
    try {
      await RankingService.updateTeamQualification(teamId, activeRound, qualified, selectedVersion, user.uid);
      success('Qualification Overridden', `Team ${teamId} is now ${qualified ? 'Qualified' : 'Eliminated'}.`);
    } catch (err: any) {
      toastError('Override Failed', err.message);
    }
  };

  const exportCSV = () => {
    if (results.length === 0) return;
    const headers = ['Rank', 'Team ID', 'Round Average', 'Qualified', 'Published'];
    const rows = results.map(r => [
      r.rank || 'N/A',
      r.teamId,
      r.roundAverage.toFixed(2),
      r.qualified ? 'Yes' : 'No',
      r.published ? 'Yes' : 'No'
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `round_${activeRound}_results.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: Column<Result & { rank?: number, qualified?: boolean }>[] = [
    {
      header: 'Rank',
      accessorKey: 'rank',
      cell: (row) => row.rank ? <span className="font-bebas text-xl text-primary">#{row.rank}</span> : <span className="text-gray-600">-</span>
    },
    {
      header: 'Team',
      accessorKey: 'teamId',
      cell: (row) => {
        const team = teams.find(t => t.id === row.teamId);
        return (
          <div>
            <div className="font-bebas text-lg text-white">{team?.name || 'Unknown Team'}</div>
            <div className="font-mono text-gray-500 text-xs">{row.teamId}</div>
          </div>
        );
      }
    },
    {
      header: 'Round Avg',
      accessorKey: 'roundAverage',
      cell: (row) => <span className="font-mono text-white">{row.roundAverage.toFixed(2)}</span>
    },
    {
      header: 'Status',
      accessorKey: 'published',
      cell: (row) => row.published ? <Badge variant="success">Published</Badge> : <Badge variant="warning">Draft</Badge>
    },
    {
      header: 'Qualification',
      accessorKey: 'qualified',
      cell: (row) => {
        if (row.qualified === undefined) return <span className="text-gray-600 text-xs">Unranked</span>;
        return (
          <select
            value={row.qualified ? 'qualified' : 'eliminated'}
            onChange={(e) => handleOverrideQualification(row.teamId, e.target.value === 'qualified')}
            className={`text-xs font-semibold rounded-full px-2 py-1 outline-none border cursor-pointer ${
              row.qualified 
                ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                : 'bg-red-500/10 text-red-500 border-red-500/20'
            }`}
          >
            <option value="qualified" className="bg-gray-900 text-green-500">Qualified</option>
            <option value="eliminated" className="bg-gray-900 text-red-500">Eliminated</option>
          </select>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" /> RESULTS ENGINE
          </h2>
          <p className="font-inter text-gray-400">Aggregate evaluations, generate rankings, and publish scores.</p>
        </div>
        <div className="flex items-center gap-3">
           <span className="text-sm font-inter text-gray-400">Round ID:</span>
           <Input 
             type="number" 
             value={Number(activeRound)} 
             onChange={(e) => {
               setActiveRound(Number(e.target.value));
               setSelectedVersion(null);
             }} 
             className="w-20 text-center" 
           />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-inter font-medium text-gray-400 text-sm">Step 1: Aggregate</h3>
            <Calculator className="w-5 h-5 text-blue-400" />
          </div>
          <Button variant="outline" className="w-full text-blue-400 border-blue-400/20 hover:bg-blue-400/10" onClick={handleGenerateResults} isLoading={isProcessing}>
            GENERATE RESULTS
          </Button>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-inter font-medium text-gray-400 text-sm">Step 2: Rank (Threshold: {qualificationThreshold})</h3>
            <BarChart className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex gap-2">
            <Input 
              type="number" 
              value={qualificationThreshold} 
              onChange={(e) => setQualificationThreshold(Number(e.target.value))} 
              className="w-16 h-10 px-2"
              title="Qualification Threshold"
            />
            <Button variant="outline" className="flex-1 text-purple-400 border-purple-400/20 hover:bg-purple-400/10" onClick={handleGenerateRankings} isLoading={isProcessing}>
              RANK TEAMS
            </Button>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-inter font-medium text-gray-400 text-sm">Step 3: Visibility</h3>
            <Eye className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 text-green-400 border-green-400/20 hover:bg-green-400/10" onClick={handlePublishAll} isLoading={isProcessing}>
              PUBLISH
            </Button>
            <Button variant="outline" className="flex-1 text-red-400 border-red-400/20 hover:bg-red-400/10" onClick={handleUnpublishAll} isLoading={isProcessing}>
              <EyeOff className="w-4 h-4" />
            </Button>
          </div>
          <div className="mt-2 space-y-2">
            <Button 
              variant={roundDoc?.showLeaderboard ? "default" : "outline"}
              className={`w-full ${roundDoc?.showLeaderboard ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent' : 'text-indigo-400 border-indigo-400/20 hover:bg-indigo-400/10'}`} 
              onClick={handleToggleLeaderboard} 
              isLoading={isProcessing}
            >
              {roundDoc?.showLeaderboard ? 'HIDE LEADERBOARD' : 'SHARE LEADERBOARD'}
            </Button>
            <Button 
              variant={roundDoc?.showScorecard !== false ? "default" : "outline"}
              className={`w-full ${roundDoc?.showScorecard !== false ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent' : 'text-indigo-400 border-indigo-400/20 hover:bg-indigo-400/10'}`} 
              onClick={handleToggleScorecard} 
              isLoading={isProcessing}
            >
              {roundDoc?.showScorecard !== false ? 'HIDE OVERALL SCORE' : 'SHARE OVERALL SCORE'}
            </Button>
            <Button 
              variant={roundDoc?.showCriteria !== false ? "default" : "outline"}
              className={`w-full ${roundDoc?.showCriteria !== false ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent' : 'text-indigo-400 border-indigo-400/20 hover:bg-indigo-400/10'}`} 
              onClick={handleToggleCriteria} 
              isLoading={isProcessing}
            >
              {roundDoc?.showCriteria !== false ? 'HIDE CRITERIA' : 'SHARE CRITERIA'}
            </Button>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-inter font-medium text-gray-400 text-sm">Step 4: Export</h3>
            <Download className="w-5 h-5 text-gray-300" />
          </div>
          <Button variant="secondary" className="w-full" onClick={exportCSV} disabled={results.length === 0}>
            EXPORT CSV
          </Button>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-white/10 shrink-0 flex items-center justify-between bg-white/5">
           <h3 className="font-bebas text-xl text-white tracking-widest">ROUND {activeRound} LEADERBOARD (v{selectedVersion || '?'})</h3>
           <div className="flex gap-4 items-center">
             <div className="flex items-center gap-2">
               <span className="text-sm text-gray-400 font-inter">Snapshot:</span>
               <select 
                 className="bg-black/50 border border-white/20 rounded px-2 py-1 text-sm text-white"
                 value={selectedVersion || ''}
                 onChange={(e) => setSelectedVersion(Number(e.target.value))}
               >
                 {versions.map(v => <option key={v} value={v}>Version {v}</option>)}
               </select>
             </div>
             <Button variant="ghost" size="sm" onClick={() => setActiveRound(activeRound)}><RefreshCw className="w-4 h-4" /></Button>
           </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <DataTable 
            columns={columns} 
            data={results}
            emptyMessage="No results generated for this round yet."
          />
        </div>
      </Card>
    </div>
  );
}
