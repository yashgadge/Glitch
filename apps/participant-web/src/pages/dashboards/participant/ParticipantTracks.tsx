import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastContext';
import { useAuth } from '@shared/contexts/AuthContext';
import { ParticipantService } from '@shared/services/ParticipantService';
import { TeamService } from '@shared/services/TeamService';
import { TrackService } from '@shared/services/TrackService';
import type { Track, ProblemStatement, Participant, Team } from '@shared/types/models';
import { Map, CheckCircle2, Lock, AlertTriangle, ExternalLink, Bot, Coins, Cpu, Pickaxe, BookOpen, Leaf, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { EventConfigService } from '@shared/services/EventConfigService';
import type { EventConfig } from '@shared/types/models';

// Helper to map string icon name to Lucide component
const getIcon = (iconName?: string) => {
  switch (iconName) {
    case 'brain': return <Bot className="w-8 h-8 text-primary mb-4" />;
    case 'wallet': return <Coins className="w-8 h-8 text-primary mb-4" />;
    case 'cpu': return <Cpu className="w-8 h-8 text-primary mb-4" />;
    case 'blocks': return <Pickaxe className="w-8 h-8 text-primary mb-4" />;
    case 'leaf': return <Leaf className="w-8 h-8 text-primary mb-4" />;
    case 'bot': return <Bot className="w-8 h-8 text-primary mb-4" />;
    default: return <BookOpen className="w-8 h-8 text-primary mb-4" />;
  }
};

export default function ParticipantTracks() {
  const { user } = useAuth();
  const { success, error } = useToast();
  
  const [profile, setProfile] = useState<Participant | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [problemStatements, setProblemStatements] = useState<Record<string, ProblemStatement[]>>({});
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [activeViewTrack, setActiveViewTrack] = useState<Track | null>(null);
  const [selectedProblemModal, setSelectedProblemModal] = useState<ProblemStatement | null>(null);
  const [eventConfig, setEventConfig] = useState<EventConfig | null>(null);

  useEffect(() => {
    const unsubConfig = EventConfigService.subscribeToConfig((config) => {
      setEventConfig(config);
    });
    return () => unsubConfig();
  }, []);

  useEffect(() => {
    const unsub = TrackService.subscribeToTracks((tracksData) => {
      setTracks(tracksData);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubs = tracks.map(track => {
      return TrackService.subscribeToProblemStatements(track.id, (statements) => {
        const availableStatements = statements.filter(s => s.active && (s.published || s.isReleased));
        setProblemStatements(prev => ({ ...prev, [track.id]: availableStatements }));
      }, true);
    });
    return () => unsubs.forEach(unsub => unsub());
  }, [tracks]);

  useEffect(() => {
    if (!user) return;
    const unsubProfile = ParticipantService.subscribeToParticipant(user.uid, (data) => setProfile(data));
    return () => unsubProfile();
  }, [user]);

  useEffect(() => {
    if (profile?.teamId) {
      const unsubTeam = TeamService.subscribeToTeam(profile.teamId, (data) => setTeam(data));
      return () => unsubTeam();
    } else if (profile && !profile.teamId) {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    const unsub = TrackService.subscribeToTracks((data) => {
      const availableTracks = data.filter(t => t.active && t.published).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setTracks(availableTracks);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSelectTrack = async (track: Track) => {
    if (!user || !team || team.leaderId !== user.uid) return;
    setIsProcessing(true);
    try {
      await TeamService.updateTeamSelection(team.id, track.id, track.name, '', user.uid);
      success(`Successfully selected track: ${track.name}!`);
    } catch (err: any) {
      error(err.message || 'Failed to select track.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectProblem = async (problem: ProblemStatement) => {
    if (!user || !team || team.leaderId !== user.uid || !activeViewTrack) return;
    setIsProcessing(true);
    try {
      await TeamService.updateTeamSelection(team.id, activeViewTrack.id, activeViewTrack.name, problem.id, user.uid);
      success(`Successfully selected problem: ${problem.title}!`);
    } catch (err: any) {
      error(err.message || 'Failed to select problem.');
    } finally {
      setIsProcessing(false);
    }
  };


  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isLeader = team?.leaderId === user?.uid;
  const isGloballyLocked = eventConfig?.trackSelectionLocked;
  const isLocked = isGloballyLocked || team?.status === 'eliminated' || team?.status === 'disqualified';

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-2">
          <Map className="w-8 h-8 text-primary" /> TRACKS & PROBLEM STATEMENTS
        </h1>
        <p className="font-inter text-gray-400">Explore the available competition tracks and select your team's problem statement. You can lock your choice anytime.</p>
      </div>

      {!team && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-500 font-inter text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> You must join or create a team before selecting a track.
          </p>
        </div>
      )}

      {team && !isLeader && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bebas tracking-widest text-blue-400 text-xl mb-1">VIEW ONLY</h4>
            <p className="text-blue-300/80 font-inter text-sm">Only the Team Leader can change and lock the track and problem selection.</p>
          </div>
        </div>
      )}

      {team && team.trackId && (
        <div className="p-5 bg-black/40 border border-primary/30 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary shadow-[0_0_15px_rgba(227,6,19,0.8)]" />
          <div className="pl-4">
            <h4 className="font-bebas tracking-wider text-xl text-primary mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> CURRENT TRACK: {team.track}
            </h4>
            <p className="text-gray-400 font-inter text-sm flex items-center gap-2">
               Your team's selected track.
            </p>
          </div>
          <div className="text-left md:text-right pl-4 md:pl-0 shrink-0 w-full md:w-auto">
            {isLocked && (
              <span className="text-red-400 font-inter font-medium text-sm flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg w-full justify-center">
                <Lock className="w-4 h-4" /> TRACK SELECTION LOCKED
              </span>
            )}
          </div>
        </div>
      )}

      {/* Track Details Modal */}
      {!activeViewTrack ? (
        // TRACKS GRID VIEW
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {tracks.map((track) => {
            const isSelected = team?.trackId === track.id || (!team?.trackId && team?.track === track.name);
            return (
              <motion.div whileHover={{ y: -5 }} key={track.id}>
                <Card 
                  className={`h-full border cursor-pointer bg-black/60 transition-all duration-300 flex flex-col
                    ${isSelected ? 'border-primary shadow-[0_0_15px_rgba(227,6,19,0.3)]' : 'border-white/10 hover:border-primary/50'}`}
                  onClick={() => setActiveViewTrack(track)}
                >
                  <CardContent className="p-6 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      {getIcon(track.icon)}
                      {isSelected && (
                        <Badge variant="default" className="bg-primary/20 text-primary border-primary/50">
                          <CheckCircle2 className="w-3 h-3 mr-1 inline" /> SELECTED
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className={`font-bebas text-2xl tracking-widest mb-2 ${isSelected ? 'text-primary' : 'text-white'}`}>
                      {track.name}
                    </h3>
                    
                    <p className="text-gray-400 font-inter text-sm mb-6 line-clamp-3 flex-grow">
                      {track.description}
                    </p>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-auto">
                      <span className="text-sm font-inter text-gray-500">
                        <span className="text-white font-medium">{(problemStatements[track.id] || []).length}</span> Problems
                      </span>
                      <span className="text-xs font-bebas tracking-wider text-primary flex items-center gap-1">
                        VIEW TRACK <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {tracks.length === 0 && (
            <div className="col-span-full text-center py-16 border-2 border-dashed border-white/10 rounded-lg">
              <h3 className="font-bebas text-2xl text-gray-500 tracking-wider mb-2">NO TRACKS AVAILABLE</h3>
              <p className="font-inter text-gray-600 text-sm">Please check back later when tracks are released.</p>
            </div>
          )}
        </div>
      ) : !selectedProblemModal ? (
        // TRACK DETAILS VIEW
        <div className="space-y-6 pt-2">
          <Button variant="ghost" onClick={() => setActiveViewTrack(null)} className="text-gray-400 hover:text-white -ml-4 mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> BACK TO TRACKS
          </Button>

          <Card className="bg-black/60 border-white/10 p-5 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getIcon(activeViewTrack.icon)}
                  <h2 className="font-bebas text-3xl md:text-4xl tracking-widest text-primary leading-none mt-2">{activeViewTrack.name}</h2>
                </div>
                <p className="text-gray-300 font-inter leading-relaxed max-w-3xl">{activeViewTrack.detailedDescription || activeViewTrack.description}</p>
              </div>
              <div className="shrink-0 w-full md:w-auto flex justify-end">
                {isLeader && !isLocked && team?.trackId !== activeViewTrack.id && (
                  <Button 
                    className="w-full md:w-auto"
                    isLoading={isProcessing}
                    onClick={() => handleSelectTrack(activeViewTrack)}
                  >
                    SELECT THIS TRACK
                  </Button>
                )}
                {team?.trackId === activeViewTrack.id && (
                  <span className="font-bebas text-primary tracking-widest px-6 py-3 bg-primary/10 rounded border border-primary/30 flex items-center justify-center gap-2 w-full md:w-auto">
                    <CheckCircle2 className="w-5 h-5" /> CURRENTLY SELECTED TRACK
                  </span>
                )}
                {!team && (
                   <span className="text-sm text-yellow-500 font-inter border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 rounded text-center w-full md:w-auto">Join a team to select a track.</span>
                )}
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between mt-6 mb-4">
            <h3 className="font-bebas text-2xl tracking-widest text-white">AVAILABLE PROBLEM STATEMENTS</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(problemStatements[activeViewTrack.id] || []).length === 0 ? (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-white/10 rounded-xl bg-black/20">
                <p className="text-gray-500 font-inter italic">No problems have been released for this track yet.</p>
              </div>
            ) : (
              (problemStatements[activeViewTrack.id] || []).map((ps, index) => {
                return (
                  <motion.div whileHover={{ y: -5 }} key={ps.id}>
                    <Card 
                      className={`h-full border cursor-pointer flex flex-col transition-all duration-300 border-white/10 bg-[#111] hover:border-white/30`}
                      onClick={() => setSelectedProblemModal(ps)}
                    >
                      <CardContent className="p-6 flex flex-col flex-grow relative">
                        <div className="flex justify-between items-start mb-4">
                          <span className="font-bebas text-3xl text-white/20 leading-none">{(index + 1).toString().padStart(2, '0')}</span>
                        </div>
                        
                        <h4 className="font-bebas text-2xl tracking-wider mb-2 line-clamp-2 leading-tight text-white">
                          {ps.title}
                        </h4>
                        
                        {ps.difficulty && (
                          <Badge variant="outline" className={`font-inter text-xs mb-4 w-fit whitespace-nowrap ${
                            ps.difficulty.toLowerCase() === 'beginner' ? 'border-green-500/30 text-green-400' :
                            ps.difficulty.toLowerCase() === 'intermediate' ? 'border-yellow-500/30 text-yellow-400' :
                            'border-red-500/30 text-red-400'
                          }`}>
                            {ps.difficulty.toUpperCase()}
                          </Badge>
                        )}
                        
                        <p className="text-gray-400 font-inter text-sm mb-6 line-clamp-3 flex-grow leading-relaxed">
                          {ps.description}
                        </p>
                        
                        <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-auto">
                          {team?.problemId === ps.id ? (
                            <span className="text-xs font-bebas tracking-wider text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> SELECTED
                            </span>
                          ) : (
                            <span className="text-xs font-bebas tracking-wider text-primary flex items-center gap-1">
                              VIEW DETAILS & SELECT <ExternalLink className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        // PROBLEM STATEMENT FULL PAGE VIEW
        <div className="space-y-6 pt-2">
          <Button variant="ghost" onClick={() => setSelectedProblemModal(null)} className="text-gray-400 hover:text-white -ml-4 mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> BACK TO {activeViewTrack.name.toUpperCase()} PROBLEMS
          </Button>

          <Card className="bg-black/60 border-white/10 p-6 md:p-10">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10 pb-8 border-b border-white/10">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <Badge variant="outline" className="border-primary/30 text-primary font-inter whitespace-nowrap bg-primary/5 px-3 py-1">{activeViewTrack.name}</Badge>
                  {selectedProblemModal.difficulty && (
                    <Badge variant="outline" className={`font-inter whitespace-nowrap px-3 py-1 ${
                      selectedProblemModal.difficulty.toLowerCase() === 'beginner' ? 'border-green-500/30 text-green-400 bg-green-500/5' :
                      selectedProblemModal.difficulty.toLowerCase() === 'intermediate' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5' :
                      'border-red-500/30 text-red-400 bg-red-500/5'
                    }`}>
                      {selectedProblemModal.difficulty.toUpperCase()}
                    </Badge>
                  )}
                </div>
                <h2 className="font-bebas text-4xl md:text-5xl text-white tracking-widest leading-tight">{selectedProblemModal.title}</h2>
              </div>
              <div className="shrink-0 w-full md:w-auto flex flex-col gap-3">
                {isLeader && !isLocked && team?.problemId !== selectedProblemModal.id && (
                  <Button 
                    className="w-full md:w-auto font-bebas text-lg px-8 py-6"
                    isLoading={isProcessing}
                    onClick={() => handleSelectProblem(selectedProblemModal)}
                  >
                    SELECT THIS PROBLEM
                  </Button>
                )}
                {team?.problemId === selectedProblemModal.id && (
                  <span className="font-bebas text-green-400 tracking-widest px-6 py-4 bg-green-500/10 rounded border border-green-500/30 flex items-center justify-center gap-2 w-full md:w-auto">
                    <CheckCircle2 className="w-6 h-6" /> CURRENTLY SELECTED PROBLEM
                  </span>
                )}
                {isLeader && isLocked && team?.problemId !== selectedProblemModal.id && (
                  <span className="text-sm text-red-400 font-inter border border-red-500/30 bg-red-500/10 px-4 py-2 rounded text-center w-full md:w-auto flex items-center gap-2 justify-center">
                    <Lock className="w-4 h-4" /> TRACK SELECTIONS ARE LOCKED
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-10">
              <div>
                <h6 className="text-sm font-bebas text-gray-500 tracking-widest mb-4">OVERVIEW</h6>
                <p className="text-lg font-inter text-gray-200 leading-relaxed whitespace-pre-wrap">{selectedProblemModal.description}</p>
              </div>
              
              {selectedProblemModal.detailedStatement && (
                <div>
                  <h6 className="text-sm font-bebas text-gray-500 tracking-widest mb-4">DETAILED STATEMENT</h6>
                  <p className="text-base font-inter text-gray-300 leading-relaxed whitespace-pre-wrap bg-black/40 p-6 md:p-8 rounded-xl border border-white/10 shadow-inner">{selectedProblemModal.detailedStatement}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {selectedProblemModal.constraints && (
                  <div>
                    <h6 className="text-sm font-bebas text-gray-500 tracking-widest mb-4">CONSTRAINTS & RULES</h6>
                    <div className="text-base font-inter text-gray-300 leading-relaxed whitespace-pre-wrap bg-red-950/20 p-6 rounded-xl border border-red-500/20 h-full">{selectedProblemModal.constraints}</div>
                  </div>
                )}
                {selectedProblemModal.expectedOutcome && (
                  <div>
                    <h6 className="text-sm font-bebas text-gray-500 tracking-widest mb-4">EXPECTED OUTCOME</h6>
                    <div className="text-base font-inter text-gray-300 leading-relaxed whitespace-pre-wrap bg-blue-950/20 p-6 rounded-xl border border-blue-500/20 h-full">{selectedProblemModal.expectedOutcome}</div>
                  </div>
                )}
              </div>
              
              {selectedProblemModal.tags && selectedProblemModal.tags.length > 0 && (
                <div>
                  <h6 className="text-sm font-bebas text-gray-500 tracking-widest mb-4">TAGS & TECHNOLOGIES</h6>
                  <div className="flex flex-wrap gap-3">
                    {selectedProblemModal.tags.map((tag: string, idx: number) => (
                      <span key={idx} className="px-5 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-inter text-gray-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedProblemModal.customSections?.map((sec: any, idx: number) => (
                <div key={idx} className="pt-8 border-t border-white/10">
                  <h6 className="text-sm font-bebas text-primary tracking-widest mb-4">{sec.heading?.toUpperCase()}</h6>
                  <p className="text-base font-inter text-gray-300 whitespace-pre-wrap">{sec.content}</p>
                </div>
              ))}

              {selectedProblemModal.links?.length > 0 && (
                <div className="pt-8 border-t border-white/10">
                  <h6 className="text-sm font-bebas text-gray-500 tracking-widest mb-5">RESOURCES</h6>
                  <div className="flex flex-wrap gap-4">
                    {selectedProblemModal.links.map((link: any, idx: number) => (
                      <a 
                        key={idx} 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg font-inter text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" /> {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
