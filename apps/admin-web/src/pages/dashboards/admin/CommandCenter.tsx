import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TerminalSquare, Search, User, Users, Shield, School, QrCode, ArrowRight, ExternalLink } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Form';
import { Button } from '../../../components/ui/Button';
import { collection, query, getDocs, where, limit } from 'firebase/firestore';
import { db } from '@shared/lib/firebase';
import type { Participant, Team, Staff, Classroom, DigitalPass } from '@shared/types/models';

type SearchResultType = 'participant' | 'team' | 'staff' | 'classroom' | 'pass';

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  raw: any;
}

export default function CommandCenter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilter, setSearchFilter] = useState<SearchResultType | 'all'>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim() || searchTerm.length < 2) return;
    
    setIsSearching(true);
    setResults([]);
    setSelectedResult(null);

    const term = searchTerm.toLowerCase();
    const newResults: SearchResult[] = [];

    try {
      // Very naive client-side search across collections for demo/operational purposes.
      // In a real large-scale prod, Algolia or MeiliSearch is used.
      
      // 1. Participants
      if (searchFilter === 'all' || searchFilter === 'participant') {
        const pSnap = await getDocs(query(collection(db, 'participants'), limit(50)));
        pSnap.forEach(doc => {
          const data = doc.data() as Participant;
          if (data.name.toLowerCase().includes(term) || data.email.toLowerCase().includes(term) || (data.glitchId && data.glitchId.toLowerCase().includes(term))) {
            newResults.push({ id: doc.id, type: 'participant', title: data.name, subtitle: data.email, raw: data });
          }
        });
      }

      // 2. Teams
      if (searchFilter === 'all' || searchFilter === 'team') {
        const tSnap = await getDocs(query(collection(db, 'teams'), limit(50)));
        tSnap.forEach(doc => {
          const data = doc.data() as Team;
          if (data.name.toLowerCase().includes(term) || data.id.toLowerCase().includes(term)) {
            newResults.push({ id: doc.id, type: 'team', title: data.name, subtitle: `Track: ${data.track}`, raw: data });
          }
        });
      }

      // 3. Staff
      if (searchFilter === 'all' || searchFilter === 'staff') {
        const sSnap = await getDocs(query(collection(db, 'staff'), limit(50)));
        sSnap.forEach(doc => {
          const data = doc.data() as Staff;
          if (data.name.toLowerCase().includes(term) || data.email.toLowerCase().includes(term)) {
            newResults.push({ id: doc.id, type: 'staff', title: data.name, subtitle: `Role: ${data.role}`, raw: data });
          }
        });
      }

      // 4. Classrooms
      if (searchFilter === 'all' || searchFilter === 'classroom') {
        const cSnap = await getDocs(query(collection(db, 'classrooms'), limit(50)));
        cSnap.forEach(doc => {
          const data = doc.data() as Classroom;
          if (data.roomNumber.toLowerCase().includes(term) || doc.id.toLowerCase().includes(term)) {
            newResults.push({ id: doc.id, type: 'classroom', title: `Room ${data.roomNumber}`, subtitle: `${data.building} - Floor ${data.floor}`, raw: data });
          }
        });
      }

      setResults(newResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const getIcon = (type: SearchResultType) => {
    switch (type) {
      case 'participant': return <User className="w-5 h-5 text-blue-400" />;
      case 'team': return <Users className="w-5 h-5 text-purple-400" />;
      case 'staff': return <Shield className="w-5 h-5 text-green-400" />;
      case 'classroom': return <School className="w-5 h-5 text-yellow-400" />;
      case 'pass': return <QrCode className="w-5 h-5 text-orange-400" />;
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div>
        <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
          <TerminalSquare className="w-8 h-8 text-primary" /> COMMAND CENTER
        </h2>
        <p className="font-inter text-gray-400">Universal search and real-time operational hub.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Search Panel */}
        <Card className="lg:col-span-1 flex flex-col h-[calc(100vh-200px)]">
          <div className="p-4 border-b border-white/10 shrink-0 bg-white/5 space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search globally..." 
                  className="pl-9"
                />
              </div>
              <Button type="submit" isLoading={isSearching}>GO</Button>
            </form>
            
            <div className="flex flex-wrap gap-2">
              {(['all', 'team', 'participant', 'staff', 'classroom'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setSearchFilter(filter)}
                  className={`px-3 py-1 text-xs font-mono tracking-wider rounded-full border transition-colors ${
                    searchFilter === filter 
                      ? 'bg-primary/20 border-primary text-primary' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {filter.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {results.map(result => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => setSelectedResult(result)}
                className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 group ${
                  selectedResult?.id === result.id ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="p-2 bg-black/30 rounded-lg shrink-0">
                  {getIcon(result.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white font-inter truncate">{result.title}</div>
                  <div className="text-xs text-gray-400 font-inter truncate">{result.subtitle}</div>
                </div>
              </button>
            ))}
            {results.length === 0 && !isSearching && searchTerm.length > 1 && (
              <div className="p-8 text-center text-gray-500 text-sm font-inter">No results found.</div>
            )}
            {results.length === 0 && !isSearching && searchTerm.length <= 1 && (
              <div className="p-8 text-center text-gray-500 text-sm font-inter">Enter at least 2 characters to search.</div>
            )}
          </div>
        </Card>

        {/* Details Panel */}
        <Card className="lg:col-span-2 flex flex-col h-[calc(100vh-200px)]">
          {!selectedResult ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
              <TerminalSquare className="w-12 h-12 mb-4 opacity-30" />
              <p className="font-inter text-gray-400">Select a record to view details.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-white/10 shrink-0 bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-black/50 rounded-xl">
                    {getIcon(selectedResult.type)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bebas tracking-wide text-white">{selectedResult.title}</h3>
                    <p className="text-sm text-gray-400 font-inter uppercase tracking-wider">{selectedResult.type} • {selectedResult.id}</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-black/50">
                <div className="space-y-6">
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pb-6 border-b border-white/10">
                    {selectedResult.type === 'participant' && (
                      <Button variant="outline" size="sm" onClick={() => navigate('/admin/participants')} rightIcon={ExternalLink}>Open in Participant Manager</Button>
                    )}
                    {selectedResult.type === 'team' && (
                      <Button variant="outline" size="sm" onClick={() => navigate('/admin/teams')} rightIcon={ExternalLink}>Open in Team Manager</Button>
                    )}
                    {selectedResult.type === 'staff' && (
                      <Button variant="outline" size="sm" onClick={() => navigate('/admin/staff')} rightIcon={ExternalLink}>Open in Staff Manager</Button>
                    )}
                    {selectedResult.type === 'classroom' && (
                      <Button variant="outline" size="sm" onClick={() => navigate('/admin/classrooms')} rightIcon={ExternalLink}>Open in Classroom Manager</Button>
                    )}
                    <Button variant="outline" size="sm" className="opacity-50 hover:opacity-100" onClick={() => console.log('Copy ID:', selectedResult.id)}>Copy ID</Button>
                  </div>

                  {/* Formatted Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedResult.raw).map(([key, value]) => {
                      if (typeof value === 'object' && value !== null) {
                        return (
                          <div key={key} className="col-span-full bg-white/5 p-4 rounded-xl border border-white/10">
                            <span className="text-xs font-inter text-gray-500 uppercase tracking-wider mb-2 block">{key}</span>
                            <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2)}</pre>
                          </div>
                        );
                      }
                      return (
                        <div key={key} className="bg-white/5 p-3 rounded-lg border border-white/10">
                          <span className="text-xs font-inter text-gray-500 uppercase tracking-wider">{key}</span>
                          <div className="font-mono text-sm text-white mt-1 break-all">{String(value)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
