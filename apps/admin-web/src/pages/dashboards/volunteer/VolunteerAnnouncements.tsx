import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Bell, AlertTriangle } from 'lucide-react';
import { AnnouncementService } from '@shared/services/AnnouncementService';
import type { Announcement } from '@shared/types/models';

export default function VolunteerAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = AnnouncementService.subscribeToAnnouncements(
      'volunteer', 
      (data) => {
        setAnnouncements(data);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
          <Bell className="w-8 h-8 text-primary" /> FIELD ANNOUNCEMENTS
        </h2>
        <p className="font-inter text-gray-400">Important operational updates for volunteers.</p>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card className="p-12 flex flex-col items-center justify-center text-center">
            <Bell className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-xl font-bebas text-gray-400">NO ANNOUNCEMENTS</h3>
            <p className="text-gray-500 font-inter mt-2">Check back later for updates.</p>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id} className={`p-6 ${announcement.priority === 'critical' ? 'border-red-500/50 bg-red-500/5' : ''}`}>
              <div className="flex items-start gap-4">
                {announcement.priority === 'critical' ? (
                  <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                ) : (
                  <Bell className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                )}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bebas text-white tracking-wide">{announcement.title}</h3>
                    {announcement.priority === 'critical' && (
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-mono uppercase tracking-wider">
                        CRITICAL
                      </span>
                    )}
                    {announcement.priority === 'high' && (
                      <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-[10px] font-mono uppercase tracking-wider">
                        IMPORTANT
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300 font-inter leading-relaxed whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                  <p className="text-xs text-gray-500 font-mono mt-4">
                    {new Date(announcement.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
