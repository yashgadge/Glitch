import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Search, ScanLine, CheckCircle, Package, AlertCircle, Clock, Undo2 } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { AttendanceService } from "@shared/services/AttendanceService";
import type { ScanResultDTO } from "@shared/services/AttendanceService";
import { EntitlementService } from '@shared/services/EntitlementService';
import { RedemptionService } from '@shared/services/RedemptionService';
import { ParticipantService } from '@shared/services/ParticipantService';
import type { Entitlement, RedemptionRecord } from '@shared/types/models';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from "../../../components/ui/ToastContext";
import { Modal } from '../../../components/ui/Modal';
import { Input, Label } from "../../../components/ui/Form";

export default function VolunteerRedemption() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const payload = searchParams.get('payload');
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [scanResult, setScanResult] = useState<ScanResultDTO | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [recentRedemptions, setRecentRedemptions] = useState<RedemptionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [volunteerName, setVolunteerName] = useState('Volunteer');
  
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedEntitlement, setSelectedEntitlement] = useState<Entitlement | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    if (!user) return;
    ParticipantService.getStaffProfile(user.uid).then(p => {
      if (p) setVolunteerName(p.name);
    });

    if (payload) {
      setLoading(true);
      AttendanceService.fetchScanDetails(payload)
        .then(data => {
          setScanResult(data);
        })
        .catch(e => toastError('Verification Failed', e.message))
        .finally(() => setLoading(false));
    }

    const unsub = RedemptionService.subscribeToRecentRedemptions(user.uid, (records) => {
      setRecentRedemptions(records);
    });

    return () => unsub();
  }, [user, payload, toastError]);

  useEffect(() => {
    if (scanResult) {
      const unsub = EntitlementService.subscribeToParticipantEntitlements(
        scanResult.participantId,
        scanResult.teamId,
        (data) => setEntitlements(data)
      );
      return () => unsub();
    }
  }, [scanResult]);

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setLoading(true);
    try {
      // Basic manual search by registration ID or Glitch ID
      const results = await ParticipantService.searchParticipants(searchQuery);
      if (results.length === 0) throw new Error('No participant found');
      const p = results[0];
      
      // We don't have the full pass token here, so we simulate the DTO or fetch a custom one
      // For manual mode, we just need basic info for EntitlementService
      setScanResult({
        participantId: p.id,
        glitchId: p.glitchId,
        registrationId: p.registrationId || '',
        name: p.name,
        college: p.college || '',
        track: '',
        teamId: p.teamId,
        currentRound: 0,
        participantStatus: p.status || '',
        digitalPassStatus: 'active',
        checkedIn: !!p.checkedIn,
        lastCheckInTime: p.checkedInAt || null,
        teamEliminated: false,
        teamDisqualified: false,
        passId: p.digitalPassId || ''
      });
      setIsManualSearchOpen(false);
    } catch (e: any) {
      toastError('Search Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!selectedEntitlement || !scanResult || !user) return;
    setIsRedeeming(true);
    try {
      await RedemptionService.redeemEntitlement(
        undefined, // entitlementId
        selectedEntitlement.productId,
        scanResult.participantId,
        scanResult.teamId,
        user.uid,
        volunteerName,
        'Field Operations Desk', // Ideally derived from assigned location
        payload ? 'qrScan' : 'manual',
        1,
        `REQ-${Date.now()}` // Basic idempotency key
      );
      success('Redeemed Successfully', `1x ${selectedEntitlement.productNameSnapshot} redeemed.`);
      setSelectedEntitlement(null);
    } catch (e: any) {
      toastError('Redemption Failed', e.message);
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleUndoRedemption = async (record: RedemptionRecord) => {
    if (!user) return;
    if (!window.confirm(`Undo redemption of ${record.quantity}x ${record.productId}?`)) return;
    try {
      await RedemptionService.undoRedemption(record.id, user.uid, 'Volunteer requested undo');
      success('Undo Successful', 'Redemption has been reversed.');
    } catch (e: any) {
      toastError('Undo Failed', e.message);
    }
  };

  const categories = Array.from(new Set(entitlements.map(e => e.category)));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white">REDEMPTION</h2>
          <p className="font-inter text-gray-400">Manage add-ons, food, and goodie distribution.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/workspace/scanner')}>
            <ScanLine className="w-4 h-4 mr-2" /> SCAN QR
          </Button>
          <Button variant="outline" onClick={() => setIsManualSearchOpen(true)}>
            <Search className="w-4 h-4 mr-2" /> MANUAL
          </Button>
        </div>
      </div>

      {loading && <div className="text-center py-10 text-primary animate-pulse font-bebas text-2xl tracking-widest">LOADING...</div>}

      {!loading && !scanResult && (
        <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed border-white/10 bg-black/20">
          <Package className="w-16 h-16 text-gray-600 mb-4" />
          <h3 className="font-bebas text-2xl text-gray-400 tracking-wider">NO PARTICIPANT SELECTED</h3>
          <p className="font-inter text-sm text-gray-500 mt-2 max-w-sm">
            Scan a participant's QR code or use manual search to view their available entitlements.
          </p>
          <div className="flex gap-4 mt-6">
            <Button onClick={() => navigate('/workspace/scanner')} variant="primary">
              <ScanLine className="w-4 h-4 mr-2" /> OPEN SCANNER
            </Button>
            <Button onClick={() => setIsManualSearchOpen(true)} variant="outline">
              MANUAL SEARCH
            </Button>
          </div>
        </Card>
      )}

      {!loading && scanResult && (
        <div className="space-y-6">
          <Card className="p-6 border-primary/30 bg-primary/5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bebas text-2xl text-white">{scanResult.name}</h3>
                <p className="font-mono text-xs text-primary">{scanResult.glitchId} | {scanResult.teamName || 'No Team'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={scanResult.checkedIn ? 'success' : 'warning'}>
                    {scanResult.checkedIn ? 'CHECKED IN' : 'NOT CHECKED IN'}
                  </Badge>
                  {!payload && <Badge variant="outline">MANUAL MODE</Badge>}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setScanResult(null)} className="text-gray-400">
                CLEAR
              </Button>
            </div>
          </Card>

          {entitlements.length === 0 ? (
            <Card className="p-8 text-center bg-black/40 border-white/5">
              <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="font-bebas text-xl text-gray-400">NO ACTIVE ENTITLEMENTS</p>
              <p className="text-sm text-gray-500">This participant has no add-ons available for redemption.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map(category => (
                <div key={category} className="space-y-4">
                  <h4 className="font-bebas text-xl text-primary border-b border-white/10 pb-2 uppercase">{category}</h4>
                  {entitlements.filter(e => e.category === category).map(ent => {
                    const isAvailable = ent.entitlementType === 'NON_CONSUMABLE' || ent.quantityRemaining > 0;
                    return (
                      <Card key={ent.id} className={`p-4 border ${isAvailable ? 'border-white/10 bg-white/5' : 'border-red-500/20 bg-red-500/5 opacity-50'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-bebas text-lg text-white tracking-wide">{ent.productNameSnapshot}</h5>
                            <p className="font-inter text-xs text-gray-400 mt-1 capitalize">{ent.ownership.toLowerCase()} Entitlement</p>
                            {ent.entitlementType !== 'NON_CONSUMABLE' && ent.entitlementType !== 'PERIOD_BASED' && (
                              <p className="font-mono text-sm mt-2">
                                <span className={ent.quantityRemaining > 0 ? 'text-green-400' : 'text-red-400'}>
                                  REMAINING: {ent.quantityRemaining}
                                </span>
                                <span className="text-gray-500 ml-3">USED: {ent.quantityUsed}</span>
                              </p>
                            )}
                          </div>
                          {isAvailable ? (
                            <Button size="sm" onClick={() => setSelectedEntitlement(ent)}>
                              REDEEM
                            </Button>
                          ) : (
                            <Badge variant="danger">DEPLETED</Badge>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Redemptions Log */}
      {!scanResult && (
        <div className="mt-8">
          <h3 className="font-bebas text-2xl text-white mb-4 border-b border-white/10 pb-2">RECENT REDEMPTIONS</h3>
          {recentRedemptions.length === 0 ? (
            <p className="text-gray-500 font-inter">No recent redemptions in your session.</p>
          ) : (
            <div className="space-y-3">
              {recentRedemptions.map(record => (
                <div key={record.id} className="flex justify-between items-center p-4 bg-black/40 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${record.status === 'redeemed' ? 'bg-green-500/20 border-green-500/30 text-green-500' : 'bg-orange-500/20 border-orange-500/30 text-orange-500'}`}>
                      {record.status === 'redeemed' ? <Package className="w-5 h-5" /> : <Undo2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bebas text-lg text-white">{record.quantity}x {record.productId}</h4>
                      <p className="font-inter text-xs text-gray-400">Participant: {record.participantId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-gray-500">
                      {new Date(record.timestamp).toLocaleTimeString()}
                    </span>
                    {record.status === 'redeemed' && (
                      <Button size="sm" variant="outline" onClick={() => handleUndoRedemption(record)}>
                        UNDO
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Search Modal */}
      <Modal isOpen={isManualSearchOpen} onClose={() => setIsManualSearchOpen(false)} title="Manual Participant Search">
        <form onSubmit={handleManualSearch} className="space-y-4">
          <div>
            <Label>Search Query</Label>
            <Input 
              placeholder="Registration ID, Name, or Email" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={() => setIsManualSearchOpen(false)}>CANCEL</Button>
            <Button type="submit" variant="primary" isLoading={loading}>SEARCH</Button>
          </div>
        </form>
      </Modal>

      {/* Redemption Confirmation Modal */}
      <Modal isOpen={!!selectedEntitlement} onClose={() => setSelectedEntitlement(null)} title="Confirm Redemption">
        {selectedEntitlement && (
          <div className="space-y-6">
            <div className="text-center p-6 bg-black/40 border border-white/10 rounded-xl">
              <h4 className="font-bebas text-3xl text-primary mb-2">{selectedEntitlement.productNameSnapshot}</h4>
              <p className="text-gray-400">Redeeming 1 unit for {scanResult?.name}</p>
              
              {!payload && (
                <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 text-sm flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Manual Redemption Mode
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setSelectedEntitlement(null)} disabled={isRedeeming}>
                CANCEL
              </Button>
              <Button type="button" variant="primary" onClick={handleRedeem} isLoading={isRedeeming}>
                CONFIRM REDEMPTION
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
