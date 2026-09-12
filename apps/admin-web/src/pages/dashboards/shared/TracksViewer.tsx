import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { TrackService } from '@shared/services/TrackService';
import type { Track, ProblemStatement } from '@shared/types/models';

export default function TracksViewer() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [problemStatements, setProblemStatements] = useState<Record<string, ProblemStatement[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = TrackService.subscribeToTracks((data) => {
      setTracks(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Only subscribe to RELEASED problem statements for staff viewers (just to be safe, though judges might need all later)
  useEffect(() => {
    const unsubs = tracks.map(track => {
      return TrackService.subscribeToProblemStatements(track.id, (statements) => {
        setProblemStatements(prev => ({ ...prev, [track.id]: statements }));
      }, true); // onlyReleased = true
    });
    return () => unsubs.forEach(unsub => unsub());
  }, [tracks]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bebas text-4xl tracking-widest text-white mb-2">TRACKS & PROBLEM STATEMENTS</h1>
        <p className="font-inter text-gray-400">View released competition tracks and their respective problem statements.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {tracks.map((track) => (
          <Card key={track.id} className="border-primary/20 bg-black/60">
            <CardHeader className="border-b border-white/10 pb-4">
              <CardTitle className="text-3xl font-bebas text-white tracking-widest">{track.name}</CardTitle>
              {track.description && <p className="text-gray-400 font-inter text-sm mt-1">{track.description}</p>}
            </CardHeader>
            <CardContent className="pt-6">
              <h3 className="font-bebas tracking-wider text-xl text-gray-400 mb-4">PROBLEM STATEMENTS</h3>
              <div className="space-y-4">
                {(problemStatements[track.id] || []).length === 0 ? (
                  <div className="p-4 border border-white/5 rounded-lg text-center text-gray-500 font-inter text-sm">
                    No released problem statements found for this track.
                  </div>
                ) : (
                  (problemStatements[track.id] || []).map(ps => (
                    <div key={ps.id} className="p-4 rounded-lg border border-white/10 bg-white/5">
                      <div className="mb-4">
                        <h4 className="font-bebas text-2xl text-white tracking-wider mb-2">{ps.title}</h4>
                        <p className="text-sm font-inter text-gray-300 leading-relaxed whitespace-pre-wrap">{ps.description}</p>
                      </div>
                      
                      {ps.customSections?.map((sec, idx) => (
                        <div key={idx} className="mt-4 pt-4 border-t border-white/10">
                          <h5 className="font-bebas tracking-wider text-lg text-primary mb-1">{sec.heading}</h5>
                          <p className="text-sm font-inter text-gray-300 whitespace-pre-wrap">{sec.content}</p>
                        </div>
                      ))}

                      {ps.links?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <h5 className="font-bebas tracking-wider text-lg text-gray-400 mb-2">RESOURCE LINKS</h5>
                          <div className="flex flex-wrap gap-2">
                            {ps.links.map((link, idx) => (
                              <a 
                                key={idx} 
                                href={link.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-md font-inter text-sm transition-colors"
                              >
                                {link.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {tracks.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-lg">
            <h3 className="font-bebas text-2xl text-gray-500 tracking-wider mb-2">NO TRACKS AVAILABLE</h3>
            <p className="font-inter text-gray-600 text-sm">Tracks will appear here once configured by the admin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
