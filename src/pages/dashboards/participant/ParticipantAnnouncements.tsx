import React, { useState, useEffect } from 'react';
import { AnnouncementService } from '../../../services/AnnouncementService';
import { ParticipantService } from '../../../services/ParticipantService';
import { useAuth } from '../../../contexts/AuthContext';
import type { Announcement, Participant } from '../../../types/models';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Megaphone, Pin, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ParticipantAnnouncements() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Participant | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = ParticipantService.subscribeToParticipant(user.uid, setProfile);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const unsub = AnnouncementService.subscribeToAnnouncements('participant', (data) => {
      // Filter logic: they should see global, participants, teams (if they have one), and their track
      const relevant = data.filter(a => {
        if (a.target === 'all' || a.target === 'participants') return true;
        if (a.target === 'teams' && profile?.teamId) return true;
        // Optionally match track if announcement targeted a specific track (assuming target holds track string)
        return false;
      });
      setAnnouncements(relevant);
      setLoading(false);
    });
    return () => unsub();
  }, [profile?.teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const pinned = announcements.filter(a => a.pinned);
  const standard = announcements.filter(a => !a.pinned);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-2">
          <Megaphone className="w-8 h-8 text-primary" /> ANNOUNCEMENTS
        </h1>
        <p className="font-inter text-gray-400">Official broadcasts, updates, and alerts from the organizing team.</p>
      </div>

      <div className="space-y-6">
        {pinned.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-bebas text-xl text-primary flex items-center gap-2 border-b border-white/10 pb-2">
              <Pin className="w-4 h-4" /> PINNED MESSAGES
            </h3>
            {pinned.map(a => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="default" className="bg-primary/20 text-primary border-primary/50">PINNED</Badge>
                        <h4 className="font-bebas text-2xl text-white tracking-wider">{a.title}</h4>
                      </div>
                      <span className="text-xs text-primary font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(a.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-inter text-gray-300 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                    <div className="mt-4 pt-4 border-t border-primary/20 flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-inter">Posted by {a.authorName}</span>
                      <Badge variant="outline" className="text-gray-400 border-white/20 uppercase tracking-widest text-[10px]">
                        TO: {a.target}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="font-bebas text-xl text-white flex items-center gap-2 border-b border-white/10 pb-2">
            LATEST UPDATES
          </h3>
          {standard.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-inter text-sm">
              No recent announcements.
            </div>
          ) : (
            standard.map(a => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bebas text-2xl text-white tracking-wider">{a.title}</h4>
                      <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(a.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-inter text-gray-400 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-inter">Posted by {a.authorName}</span>
                      <Badge variant="outline" className="text-gray-400 border-white/20 uppercase tracking-widest text-[10px]">
                        TO: {a.target}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
