import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { ParticipantService } from '../../../services/ParticipantService';
import { RoundService } from '../../../services/RoundService';
import { ResultsService } from '../../../services/ResultsService';
import type { Participant, Round, Result } from '../../../types/models';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Award, Lock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ParticipantResults() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Participant | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [results, setResults] = useState<Record<number, Result>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsubProfile = ParticipantService.subscribeToParticipant(user.uid, (data) => setProfile(data));
    return () => unsubProfile();
  }, [user]);

  useEffect(() => {
    const fetchRounds = async () => {
      const data = await RoundService.getAllRounds();
      setRounds(data.sort((a, b) => b.id - a.id)); // Latest round first
      setLoading(false);
    };
    fetchRounds();
  }, []);

  useEffect(() => {
    if (!profile?.teamId || rounds.length === 0) return;

    const unsubs: Array<() => void> = [];

    rounds.forEach(round => {
      const unsub = ResultsService.subscribeToTeamResult(profile.teamId!, round.id, true, (result) => {
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

          return (
            <motion.div key={round.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={result && result.qualified ? 'border-primary/30 bg-primary/5' : 'border-white/10'}>
                <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bebas text-xl ${result ? (result.qualified ? 'bg-primary text-white' : 'bg-white/10 text-gray-300') : 'bg-black/50 text-gray-600 border border-white/5'}`}>
                      R{round.id}
                    </div>
                    <div>
                      <CardTitle className={`text-2xl font-bebas tracking-wider ${!result ? 'text-gray-500' : 'text-white'}`}>
                        {round.name}
                      </CardTitle>
                    </div>
                  </div>
                  {result ? (
                    result.qualified ? (
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
                  {!result ? (
                    <div className="text-center py-8">
                      <Lock className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                      <p className="font-inter text-gray-500 text-sm">Results for this round have not been published yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Overall Score */}
                      <div className="md:col-span-1 flex flex-col items-center justify-center p-6 bg-black/40 rounded-xl border border-white/5">
                        <p className="font-inter text-gray-400 text-xs tracking-widest uppercase mb-2">Overall Average</p>
                        <h2 className={`font-bebas text-6xl ${result.qualified ? 'text-primary drop-shadow-[0_0_15px_rgba(227,6,19,0.3)]' : 'text-white'}`}>
                          {result.totalScore.toFixed(1)}
                        </h2>
                        {result.rank && (
                          <div className="mt-4 px-3 py-1 bg-white/10 rounded-full border border-white/20 font-inter text-xs text-white">
                            Global Rank: #{result.rank}
                          </div>
                        )}
                      </div>
                      
                      {/* Criteria Breakdown */}
                      <div className="md:col-span-2 space-y-4">
                        <h4 className="font-inter text-sm font-medium text-gray-300 border-b border-white/10 pb-2">CRITERIA AVERAGES</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(result.criteriaScores).map(([criterion, score]) => (
                            <div key={criterion} className="bg-white/5 p-3 rounded-lg border border-white/5">
                              <p className="font-inter text-xs text-gray-400 uppercase mb-1 truncate">{criterion}</p>
                              <p className="font-mono text-xl text-white">{score.toFixed(1)}</p>
                            </div>
                          ))}
                        </div>
                        {result.remarks && (
                          <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                            <p className="font-inter text-xs text-primary uppercase mb-1">ORGANIZER REMARKS</p>
                            <p className="font-inter text-sm text-gray-300">{result.remarks}</p>
                          </div>
                        )}
                      </div>
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
