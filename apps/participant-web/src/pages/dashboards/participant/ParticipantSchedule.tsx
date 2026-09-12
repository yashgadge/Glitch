import React, { useState, useEffect } from 'react';
import { RoundService } from '@shared/services/RoundService';
import { EventConfigService } from '@shared/services/EventConfigService';
import type { Round, EventConfig, EventTimelineItem } from '@shared/types/models';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Calendar, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ParticipantSchedule() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [timeline, setTimeline] = useState<EventTimelineItem[]>([]);
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRounds = async () => {
      const data = await RoundService.getAllRounds();
      setRounds(data.sort((a, b) => a.id - b.id)); // Ensure chronological order
    };
    fetchRounds();

    const unsubConfig = EventConfigService.subscribeToConfig((data) => {
      setConfig(data);
      if (data?.timeline) {
        setTimeline(data.timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()));
      }
      setLoading(false);
    });

    return () => unsubConfig();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Combine rounds and timeline for display if we want, or display timeline on top of rounds.
  // The user expects the custom timeline added in admin to appear here.

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-2">
          <Calendar className="w-8 h-8 text-primary" /> EVENT SCHEDULE
        </h1>
        <p className="font-inter text-gray-400">The official timeline and round schedule for the hackathon.</p>
      </div>

      {timeline.length > 0 && (
        <div className="mb-12">
          <h2 className="font-bebas text-2xl tracking-widest text-primary mb-6">EVENT TIMELINE</h2>
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
            {timeline.map((item, idx) => {
              const d = new Date(item.time);
              const isPast = d.getTime() < Date.now();
              const formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              return (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
                >
                  {/* Timeline dot */}
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0a0a0a] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-xl z-10 ${isPast ? 'bg-white/20 text-gray-400' : 'bg-primary text-white shadow-[0_0_15px_rgba(227,6,19,0.5)]'}`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  
                  {/* Card */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4">
                    <Card className={`transition-all duration-300 ${!isPast ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-black/40'}`}>
                      <CardHeader className="pb-3 border-b border-white/5">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center justify-between">
                          <CardTitle className={`text-xl font-bebas tracking-wider ${!isPast ? 'text-primary' : 'text-gray-300'}`}>
                            {item.title}
                          </CardTitle>
                          <Badge variant="outline" className="text-gray-400 border-white/10 self-start md:self-auto font-mono">
                            DAY {item.day} • {formattedTime}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className={`font-inter text-sm ${!isPast ? 'text-gray-300' : 'text-gray-500'}`}>
                          {item.description}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {rounds.length > 0 && (
        <div>
          <h2 className="font-bebas text-2xl tracking-widest text-primary mb-6">COMPETITION ROUNDS</h2>
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
            {rounds.map((round, idx) => {
              const isActive = config?.currentRound === round.id;
              const isPast = config?.currentRound ? config.currentRound > round.id : false;

              return (
                <motion.div 
                  key={round.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0a0a0a] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-xl z-10 ${isActive ? 'bg-primary text-white shadow-[0_0_15px_rgba(227,6,19,0.5)]' : isPast ? 'bg-white/20 text-gray-400' : 'bg-[#111] text-gray-500'}`}>
                    <span className="font-bebas text-lg">{round.id}</span>
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4">
                    <Card className={`transition-all duration-300 ${isActive ? 'border-primary/50 bg-primary/5 shadow-[0_0_30px_rgba(227,6,19,0.1)]' : 'border-white/10 bg-black/40'}`}>
                      <CardHeader className="pb-3 border-b border-white/5">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center justify-between">
                          <CardTitle className={`text-2xl font-bebas tracking-wider ${isActive ? 'text-primary' : isPast ? 'text-gray-300' : 'text-gray-500'}`}>
                            {round.displayName || round.name}
                          </CardTitle>
                          {isActive && <Badge variant="default" className="bg-primary/20 text-primary border-primary/50 self-start md:self-auto animate-pulse">ACTIVE NOW</Badge>}
                          {isPast && <Badge variant="outline" className="text-gray-500 border-white/10 self-start md:self-auto">COMPLETED</Badge>}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className={`font-inter text-sm mb-4 ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                          {round.description}
                        </p>
                        <div className="flex flex-wrap gap-4">
                          {round.startAt && (
                            <div className="flex items-center gap-1.5 text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded">
                              <Clock className="w-3 h-3" /> {new Date(round.startAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                          {round.endAt && (
                            <div className="flex items-center gap-1.5 text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded">
                              <Clock className="w-3 h-3" /> Ends: {new Date(round.endAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
