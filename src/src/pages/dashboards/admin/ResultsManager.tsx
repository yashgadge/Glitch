import React, { useState, useEffect } from 'react';
import { Trophy, Calculator, Eye, EyeOff, Download, RefreshCw, BarChart } from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Form';
import { useToast } from '../../../components/ui/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Badge } from '../../../components/ui/Badge';
import { AggregationService } from '../../../services/AggregationService';
import { RankingService } from '../../../services/RankingService';
import { ResultsService } from '../../../services/ResultsService';
import type { Result, Ranking } from '../../../types/models';
import { guardValue } from '../../../lib/firestoreGuard';

export default function ResultsManager() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [activeRound, setActiveRound] = useState<number>(1);
  const [results, setResults] = useState<(Result & { rank?: number, qualified?: boolean })[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qualificationThreshold, setQualificationThreshold] = useState<number>(10);

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

    const unsubRank = onSnapshot(rankQ, (snap) => {
      localRankings = snap.docs.map(d => ({ id: d.id, ...d.data() } as Ranking));
      buildView();
    });

    return () => {
      unsubRes();
      unsubRank();
    };
  }, [activeRound]);

  const handleGenerateResults = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      // Get all active teams
      const q = query(collection(db, 'teams'), where('status', 'not-in', ['eliminated', 'disqualified'])); // unchanged
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
      success('Rankings Generated', 'Teams have been ranked based on their results.');
    } catch (err: any) {
      toastError('Ranking Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublishAll = async () => {
    setIsProcessing(true);
    try {
      for (const result of results) {
        if (!result.published) {
          await ResultsService.publishResult(result.id);
        }
      }
      await RankingService.publishRankings(activeRound, user!.uid);
      success('Published', 'Results and rankings are now visible to participants.');
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
      header: 'Team ID',
      accessorKey: 'teamId',
      cell: (row) => <span className="font-mono text-white text-sm">{row.teamId}</span>
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
        return row.qualified ? <Badge variant="success" className="bg-green-500/10 text-green-500 border-green-500/20">Qualified</Badge> : <Badge variant="danger">Eliminated</Badge>;
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
             onChange={(e) => setActiveRound(Number(e.target.value))} 
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
           <h3 className="font-bebas text-xl text-white tracking-widest">ROUND {activeRound} LEADERBOARD</h3>
           <div className="flex gap-2">
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
