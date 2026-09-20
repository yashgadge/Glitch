import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Search, User, School, XCircle, ScanLine } from 'lucide-react';
import { ParticipantService } from '../../services/ParticipantService';
import { TeamService } from '../../services/TeamService';
import type { Participant, Team } from '../../types/models';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';

export default function VolunteerSearch() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const unsubP = ParticipantService.subscribeToAllParticipants((pts) => {
      setParticipants(pts);
    });
    const unsubT = TeamService.subscribeToAllTeams((tms) => {
      const tmMap = tms.reduce((acc, t) => { acc[t.id] = t; return acc; }, {} as Record<string, Team>);
      setTeams(tmMap);
    });
    // This could be heavy in a real prod app with 10k passes, but for this college hackathon scope it's ok.
    const fetchPasses = async () => {
      // Simplification: we might not load ALL passes live, just search dynamically.
      // We will only do client-side filtering for simplicity.
      setLoading(false);
    };
    fetchPasses();

    return () => {
      unsubP();
      unsubT();
    };
  }, []);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return [];
    const q = debouncedSearch.toLowerCase();
    
    return participants
      .filter(p => {
        const teamName = p.teamId ? (teams[p.teamId]?.name || '') : '';
        return (
          p.name.toLowerCase().includes(q) ||
          p.college.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          teamName.toLowerCase().includes(q)
        );
      })
      .map(p => ({
        ...p,
        teamName: p.teamId ? (teams[p.teamId]?.name || 'Unknown Team') : 'No Team',
        passStatus: 'Unknown' // Digital passes aren't loaded wholly for memory reasons
      }))
      .slice(0, 50); // Limit to 50 results
  }, [participants, teams, debouncedSearch]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <Search className="w-8 h-8 text-primary" /> PARTICIPANT SEARCH
          </h2>
          <p className="font-inter text-gray-400">Rapid read-only lookup for on-field verification.</p>
        </div>
        
        <div className="relative w-full md:w-96 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search by name, ID, team..."
              className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white font-inter focus:outline-none focus:border-primary transition-colors text-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            className="h-[52px] px-4" 
            onClick={() => window.location.href = '/workspace/scanner'}
            title="Scan QR Code"
          >
            <ScanLine className="w-5 h-5 text-primary" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : debouncedSearch.trim() === '' ? (
          <EmptyState 
            icon={Search}
            title="SEARCH PARTICIPANTS"
            description="Enter a name, ID, college, or team name to begin."
          />
        ) : filtered.length === 0 ? (
          <EmptyState 
            icon={XCircle}
            title="NO RESULTS FOUND"
            description="Try adjusting your search terms."
            className="border-red-500/20 bg-red-500/5 text-red-400"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(p => (
              <Card key={p.id} className="p-4 flex items-start gap-4 hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bebas text-xl text-white truncate">{p.name}</h4>
                  <div className="flex items-center text-sm text-gray-400 font-inter truncate gap-2 mt-1">
                    <School className="w-3 h-3" /> {p.college}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">{p.role}</Badge>
                    <Badge variant={p.teamName === 'No Team' ? 'danger' : 'success'}>
                      {p.teamName}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 font-mono truncate">
                    ID: {p.id}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
