import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Search, User, School, XCircle, ScanLine, Calendar, Clock, AlertTriangle, LogOut, Package } from 'lucide-react';
import { ParticipantService } from '@shared/services/ParticipantService';
import { TeamService } from '@shared/services/TeamService';
import { EntitlementService } from '@shared/services/EntitlementService';
import type { Participant, Team, Entitlement } from '@shared/types/models';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Modal } from '../../../components/ui/Modal';
import { useAuth } from '@shared/contexts/AuthContext';
import { AttendanceService } from '@shared/services/AttendanceService';
import { useToast } from '../../../components/ui/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function VolunteerParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [isRevoking, setIsRevoking] = useState(false);
  
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const unsubP = ParticipantService.subscribeToAllParticipants((pts) => {
      setParticipants(pts);
      setLoading(false);
    });
    const unsubT = TeamService.subscribeToAllTeams((tms) => {
      const tmMap = tms.reduce((acc, t) => { acc[t.id] = t; return acc; }, {} as Record<string, Team>);
      setTeams(tmMap);
    });

    return () => {
      unsubP();
      unsubT();
    };
  }, []);

  useEffect(() => {
    if (selectedParticipant) {
      const unsub = EntitlementService.subscribeToParticipantEntitlements(
        selectedParticipant.id,
        selectedParticipant.teamId,
        (data) => setEntitlements(data)
      );
      return () => unsub();
    } else {
      setEntitlements([]);
    }
  }, [selectedParticipant]);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return [];
    const q = debouncedSearch.toLowerCase();
    
    return participants
      .filter(p => {
        const teamName = p.teamId ? (teams[p.teamId]?.name || '') : '';
        return (
          p.name.toLowerCase().includes(q) ||
          (p.college && p.college.toLowerCase().includes(q)) ||
          p.email.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          (p.registrationId && p.registrationId.toLowerCase().includes(q)) ||
          (p.mobile && p.mobile.includes(q)) ||
          (p.teamId && p.teamId.toLowerCase().includes(q)) ||
          teamName.toLowerCase().includes(q)
        );
      })
      .map(p => ({
        ...p,
        teamName: p.teamId ? (teams[p.teamId]?.name || 'Unknown Team') : 'No Team'
      }))
      .slice(0, 50); // Limit to 50 results
  }, [participants, teams, debouncedSearch]);

  const displayedParticipants = debouncedSearch.trim() === '' 
    ? participants.slice(0, 50).map(p => ({
        ...p,
        teamName: p.teamId ? (teams[p.teamId]?.name || 'Unknown Team') : 'No Team'
      }))
    : filtered;

  const handleReportLostPass = async (participant: Participant) => {
    if (!user || !participant.digitalPassId) return;
    if (!window.confirm('Are you sure you want to report this pass as lost? It will be instantly revoked.')) return;
    
    setIsRevoking(true);
    try {
      await AttendanceService.revokePass(participant.digitalPassId, user.uid, 'Lost Pass reported by Volunteer');
      success('Pass has been revoked successfully.');
      setSelectedParticipant(null);
    } catch (err: any) {
      error(err.message || 'Failed to revoke pass');
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <Search className="w-8 h-8 text-primary" /> PARTICIPANT SEARCH
          </h2>
          <p className="font-inter text-gray-400">Find participants for quick operational lookups.</p>
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
            onClick={() => navigate('/workspace/scanner')}
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
        ) : displayedParticipants.length === 0 ? (
          <EmptyState 
            icon={XCircle}
            title={debouncedSearch.trim() === '' ? "NO PARTICIPANTS FOUND" : "NO RESULTS FOUND"}
            description={debouncedSearch.trim() === '' ? "No participants have been registered yet." : "Try adjusting your search terms."}
            className="border-red-500/20 bg-red-500/5 text-red-400"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedParticipants.map((p: any) => (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} key={p.id}>
                <Card 
                  className="p-4 flex items-start gap-4 hover:border-primary/50 transition-colors cursor-pointer h-full"
                  onClick={() => setSelectedParticipant(p)}
                >
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
                      {p.checkedIn && <Badge variant="success">Checked In</Badge>}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedParticipant && (
          <Modal 
            isOpen={!!selectedParticipant} 
            onClose={() => setSelectedParticipant(null)} 
            title="OPERATIONAL DETAILS"
          >
            <div className="space-y-6 h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bebas text-3xl text-white tracking-wide">{selectedParticipant.name}</h3>
                    <p className="text-gray-400 font-inter text-sm flex items-center gap-2 mt-1">
                      <School className="w-4 h-4" /> {selectedParticipant.college || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-black/30 border border-white/5 rounded-lg">
                    <span className="text-[10px] text-gray-500 font-inter uppercase tracking-widest">Participant ID</span>
                    <p className="font-mono text-primary text-sm mt-1">{selectedParticipant.id}</p>
                  </div>
                  <div className="p-3 bg-black/30 border border-white/5 rounded-lg">
                    <span className="text-[10px] text-gray-500 font-inter uppercase tracking-widest">Team</span>
                    <p className="font-mono text-white text-sm mt-1 truncate">{(selectedParticipant as any).teamName}</p>
                  </div>
                </div>

                {selectedParticipant.checkedIn ? (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="font-bebas text-xl text-green-400">CHECKED IN</p>
                      <p className="text-xs text-gray-400 font-inter mt-1 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> {new Date(selectedParticipant.checkedInAt!).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-500/10 border border-gray-500/20 rounded-lg flex items-center gap-3">
                    <LogOut className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="font-bebas text-xl text-gray-400">NOT CHECKED IN</p>
                      <p className="text-xs text-gray-500 font-inter mt-1">Pending arrival scan</p>
                    </div>
                  </div>
                )}
                
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bebas text-xl text-white">ENTITLEMENTS</h4>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                      onClick={() => navigate('/workspace/redemption')}
                    >
                      <Package className="w-4 h-4 mr-2" /> REDEEM
                    </Button>
                  </div>
                  
                  {entitlements.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No entitlements found.</p>
                  ) : (
                    <div className="space-y-3">
                      {entitlements.map(ent => (
                        <div key={ent.id} className="flex justify-between items-center bg-black/40 p-3 rounded border border-white/5">
                          <div>
                            <span className="text-white text-sm font-medium">{ent.productNameSnapshot}</span>
                            <span className="text-gray-500 text-xs block capitalize">{ent.category}</span>
                          </div>
                          <div className="text-right">
                            {ent.entitlementType !== 'NON_CONSUMABLE' && ent.entitlementType !== 'PERIOD_BASED' ? (
                              <Badge variant={ent.quantityRemaining > 0 ? 'success' : 'danger'}>
                                {ent.quantityRemaining} LEFT
                              </Badge>
                            ) : (
                              <Badge variant="outline">ACTIVE</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 pt-4">
                  <Button 
                    variant="ghost" 
                    className="w-full text-red-500 hover:bg-red-500/10"
                    onClick={() => handleReportLostPass(selectedParticipant)}
                    disabled={isRevoking || !selectedParticipant.digitalPassId}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    {isRevoking ? 'REVOKING...' : 'REPORT LOST PASS'}
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
