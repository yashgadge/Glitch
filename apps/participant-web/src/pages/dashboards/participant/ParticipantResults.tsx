import React, { useState, useEffect } from 'react';
import { useAuth } from '@shared/contexts/AuthContext';
import { ParticipantService } from '@shared/services/ParticipantService';
import { RoundService } from '@shared/services/RoundService';
import { ResultsService } from '@shared/services/ResultsService';
import { RankingService } from '@shared/services/RankingService';
import { TeamService } from '@shared/services/TeamService';
import type { Participant, Round, Result, Ranking, Team } from '@shared/types/models';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Award, Lock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ParticipantResults() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Participant | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [results, setResults] = useState<Record<number, Result>>({});
  const [rankings, setRankings] = useState<Record<number, Ranking>>({});
  const [leaderboards, setLeaderboards] = useState<Record<number, Ranking[]>>({});
  const [expandedLeaderboards, setExpandedLeaderboards] = useState<Record<number, boolean>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const toggleLeaderboard = (roundId: number) => {
    setExpandedLeaderboards(prev => ({ ...prev, [roundId]: !prev[roundId] }));
  };

  useEffect(() => {
    const fetchTeams = async () => {
      const allTeams = await TeamService.getAllTeams();
      setTeams(allTeams);
    };
    fetchTeams();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubProfile = ParticipantService.subscribeToParticipant(user.uid, (data) => setProfile(data));
    return () => unsubProfile();
  }, [user]);

  useEffect(() => {
    const unsubRounds = RoundService.subscribeToAllRounds((data) => {
      setRounds(data.sort((a, b) => b.id - a.id)); // Latest round first
      setLoading(false);
    });
    return () => unsubRounds();
  }, []);

  useEffect(() => {
    if (rounds.length === 0) return;
    const unsubs: Array<() => void> = [];
    
    rounds.forEach(round => {
      if (round.showLeaderboard) {
        const unsub = RankingService.subscribeToPublishedRankingsForRound(Number(round.id), (lb) => {
          setLeaderboards(prev => ({ ...prev, [round.id]: lb }));
        });
        unsubs.push(unsub);
      } else {
        setLeaderboards(prev => {
          const next = { ...prev };
          delete next[round.id];
          return next;
        });
      }
    });
    
    return () => unsubs.forEach(unsub => unsub());
  }, [rounds]);

  useEffect(() => {
    if (!profile?.teamId || rounds.length === 0) return;

    const unsubs: Array<() => void> = [];

    rounds.forEach(round => {
      const unsub = ResultsService.subscribeToTeamResult(profile.teamId!, Number(round.id), true, (result) => {
        setResults(prev => {
          if (result) {
            return { ...prev, [round.id]: result };
          } else {
            const next = { ...prev };
            delete next[round.id];
            return next;
          }
        });
      });
      unsubs.push(unsub);
      
      const unsubRank = RankingService.subscribeToTeamRanking(profile.teamId!, Number(round.id), true, (ranking) => {
        setRankings(prev => {
          if (ranking) {
            return { ...prev, [round.id]: ranking };
          } else {
            const next = { ...prev };
            delete next[round.id];
            return next;
          }
        });
      });
      unsubs.push(unsubRank);
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [profile?.teamId, rounds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile?.teamId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-2">
            <Award className="w-8 h-8 text-primary" /> COMPETITION RESULTS
          </h1>
          <p className="font-inter text-gray-400">Aggregated scores and qualification status for your team.</p>
        </div>
        <Card className="border-dashed border-2 border-white/20 bg-black/50">
          <CardContent className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <ShieldAlert className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className="font-bebas text-2xl text-white mb-2 tracking-wider">TEAM REQUIRED</h3>
            <p className="font-inter text-gray-400 text-sm leading-relaxed mb-6">
              You must be in a team to view competition results.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-2">
          <Award className="w-8 h-8 text-primary" /> COMPETITION RESULTS
        </h1>
        <p className="font-inter text-gray-400">Aggregated scores and qualification status for your team. Individual judge scores are kept strictly confidential.</p>
      </div>

      <div className="space-y-6">
        {rounds.map(round => {
          const result = results[round.id];
          const ranking = rankings[round.id];

          return (
            <motion.div key={round.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={ranking && ranking.qualified ? 'border-primary/30 bg-primary/5' : 'border-white/10'}>
                <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bebas text-xl ${ranking ? (ranking.qualified ? 'bg-primary text-white' : 'bg-white/10 text-gray-300') : 'bg-black/50 text-gray-600 border border-white/5'}`}>
                      R{round.id}
                    </div>
                    <div>
                      <CardTitle className={`text-2xl font-bebas tracking-wider ${!ranking ? 'text-gray-500' : 'text-white'}`}>
                        {round.name}
                      </CardTitle>
                    </div>
                  </div>
                  {ranking ? (
                    ranking.qualified ? (
                      <Badge variant="default" className="bg-primary/20 text-primary border-primary/50 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> QUALIFIED
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-400 border-white/20">ELIMINATED</Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="bg-black text-gray-500 border-white/5 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> NOT PUBLISHED
                    </Badge>
                  )}
                </CardHeader>
                
                <CardContent className="pt-6">
                  {(!result || !ranking) ? (
                    <div className="text-center py-8">
                      <Lock className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                      <p className="font-inter text-gray-500 text-sm">Results for this round have not been published yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Global Rank */}
                        <div className={`flex flex-col items-center justify-center p-6 bg-black/40 rounded-xl border border-white/5 ${(round.showScorecard === false && round.showCriteria === false) ? 'md:col-span-4' : (round.showCriteria === false ? 'md:col-span-2' : 'md:col-span-1')}`}>
                          <p className="font-inter text-gray-400 text-xs tracking-widest uppercase mb-2">Global Rank</p>
                          <h2 className={`font-bebas text-6xl ${ranking.qualified ? 'text-primary drop-shadow-[0_0_15px_rgba(227,6,19,0.3)]' : 'text-white'}`}>
                            #{ranking.rank}
                          </h2>
                          {ranking.qualified ? (
                            <div className="mt-4 px-3 py-1 bg-primary/20 text-primary rounded-full border border-primary/50 font-inter text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> QUALIFIED
                            </div>
                          ) : (
                            <div className="mt-4 px-3 py-1 bg-white/5 text-gray-400 rounded-full border border-white/10 font-inter text-xs uppercase tracking-widest">
                              ELIMINATED
                            </div>
                          )}
                        </div>

                        {/* Overall Score */}
                        {round.showScorecard !== false && (
                          <div className={`flex flex-col items-center justify-center p-6 bg-black/40 rounded-xl border border-white/5 ${round.showCriteria === false ? 'md:col-span-2' : 'md:col-span-1'}`}>
                            <p className="font-inter text-gray-400 text-xs tracking-widest uppercase mb-2">Overall Average</p>
                            <h2 className="font-bebas text-6xl text-white">
                              {result.roundAverage.toFixed(1)}
                            </h2>
                          </div>
                        )}
                        
                        {/* Criteria Breakdown */}
                        {round.showCriteria !== false && (
                          <div className={`space-y-4 ${round.showScorecard !== false ? 'md:col-span-2' : 'md:col-span-3'}`}>
                            <h4 className="font-inter text-sm font-medium text-gray-300 border-b border-white/10 pb-2">CRITERIA AVERAGES</h4>
                            <div className="grid grid-cols-2 gap-4">
                              {Object.entries(result.criteriaAverages || {}).map(([criterion, score]) => (
                                <div key={criterion} className="bg-white/5 p-3 rounded-lg border border-white/5">
                                  <p className="font-inter text-xs text-gray-400 uppercase mb-1 truncate">{criterion}</p>
                                  <p className="font-mono text-xl text-white">{Number(score).toFixed(1)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Public Leaderboard */}
                      {round.showLeaderboard && leaderboards[round.id] && (
                        <div className="mt-8 pt-8 border-t border-white/10">
                          <h4 className="font-bebas text-2xl tracking-widest text-white mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-primary" /> GLOBAL LEADERBOARD
                          </h4>
                          <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden">
                            <table className="w-full text-left font-inter text-sm">
                              <thead className="bg-white/5 text-gray-400 border-b border-white/10">
                                <tr>
                                  <th className="p-4 font-medium">Rank</th>
                                  <th className="p-4 font-medium">Team</th>
                                  <th className="p-4 font-medium text-right">Score</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {(() => {
                                  const isExpanded = expandedLeaderboards[round.id];
                                  const lbData = leaderboards[round.id] || [];
                                  
                                  const visibleRows = isExpanded ? lbData : lbData.slice(0, 15);
                                  
                                  const myTeamIndex = lbData.findIndex(lb => lb.teamId === profile.teamId);
                                  const isMyTeamVisible = isExpanded || (myTeamIndex !== -1 && myTeamIndex < 15);
                                  
                                  const renderRow = (lb: any, isPinned = false) => {
                                    const isMe = lb.teamId === profile.teamId;
                                    const team = teams.find(t => t.id === lb.teamId);
                                    return (
                                      <tr key={`${lb.id}${isPinned ? '-pinned' : ''}`} className={isMe ? 'bg-primary/20' : 'hover:bg-white/5'}>
                                        <td className={`p-4 font-bebas text-xl ${isMe ? 'text-primary' : 'text-gray-300'}`}>#{lb.rank}</td>
                                        <td className={`p-4 ${isMe ? 'text-white font-semibold' : 'text-gray-300'} flex items-center gap-2`}>
                                          {team?.name || lb.teamId}
                                          {isMe && <Badge variant="default" className="bg-primary/20 text-primary border-primary/50 text-[10px] ml-2">YOU</Badge>}
                                        </td>
                                        <td className={`p-4 text-right font-mono ${isMe ? 'text-primary' : 'text-gray-400'}`}>
                                          {lb.score?.toFixed(2) || '0.00'}
                                        </td>
                                      </tr>
                                    );
                                  };

                                  return (
                                    <>
                                      {visibleRows.map(lb => renderRow(lb))}
                                      
                                      {!isExpanded && !isMyTeamVisible && myTeamIndex !== -1 && (
                                        <>
                                          <tr className="bg-black/80">
                                            <td colSpan={3} className="py-2 text-center text-gray-500 text-xs tracking-widest">...</td>
                                          </tr>
                                          {renderRow(lbData[myTeamIndex], true)}
                                        </>
                                      )}
                                    </>
                                  );
                                })()}
                              </tbody>
                            </table>
                            
                            {leaderboards[round.id].length > 15 && (
                              <div className="p-2 border-t border-white/10 flex justify-center bg-white/5">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => toggleLeaderboard(round.id)}
                                  className="text-gray-400 hover:text-white"
                                >
                                  {expandedLeaderboards[round.id] ? 'SHOW TOP 15' : `SHOW ALL ${leaderboards[round.id].length} TEAMS`}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
