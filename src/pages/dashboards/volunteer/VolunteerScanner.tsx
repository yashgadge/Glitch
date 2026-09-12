import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ScanLine, CheckCircle, XCircle, User } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { ParticipantService } from '../../../services/ParticipantService';
import { TeamService } from '../../../services/TeamService';
import { AttendanceService } from '../../../services/AttendanceService';
import type { ScanResultDTO } from '../../../services/AttendanceService';
import { Badge } from '../../../components/ui/Badge';

interface ScanResult {
  success: boolean;
  data?: ScanResultDTO;
  reason?: string;
  scannedPayload?: string;
}

export default function VolunteerScanner() {
  const { user } = useAuth();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const lastScanRef = useRef<number>(0);
  const [volunteerName, setVolunteerName] = useState('Volunteer');

  useEffect(() => {
    if (!user) return;
    ParticipantService.getStaffProfile(user.uid).then(p => {
      if (p) setVolunteerName(p.name);
    });

    const onScanSuccess = async (decodedText: string) => {
      const now = Date.now();
      if (now - lastScanRef.current < 3000) return; // 3 second cooldown
      if (isProcessingRef.current) return; // Prevent double validation

      lastScanRef.current = now;
      setIsProcessing(true);
      isProcessingRef.current = true;
      
      // Pause scanning visually
      scannerRef.current?.pause(true);
      
      try {
        const data = await AttendanceService.fetchScanDetails(decodedText);
        setScanResult({ success: true, data, scannedPayload: decodedText });
      } catch (err: any) {
        setScanResult({ success: false, reason: err.message || 'Scan processing failed' });
      } finally {
        setIsProcessing(false);
        isProcessingRef.current = false;
      }
    };

    const onScanFailure = () => {};

    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 }, 
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          videoConstraints: { facingMode: "environment" }
        },
        false
      );
      scannerRef.current.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => console.error(error));
        scannerRef.current = null;
      }
    };
  }, [user]);

  const resetScanner = () => {
    setScanResult(null);
    setIsProcessing(false);
    isProcessingRef.current = false;
    if (scannerRef.current) {
      scannerRef.current.resume();
    }
  };

  const handleApprove = async () => {
    const data = scanResult?.data;
    if (!data || !user) return;
    setIsProcessing(true);
    try {
      await AttendanceService.approveCheckIn(
        data.participantId, data.passId, scanResult.scannedPayload!, user.uid, volunteerName
      );
      setScanResult(prev => prev && prev.data ? { ...prev, data: { ...prev.data, checkedIn: true, participantStatus: 'checked_in' } } : prev);
    } catch (err: any) {
      alert(err.message || 'Approve failed');
    } finally { setIsProcessing(false); }
  };

  const handleUndoCheckIn = async () => {
    const data = scanResult?.data;
    if (!data || !user) return;
    setIsProcessing(true);
    try {
      await AttendanceService.undoCheckIn(
        data.participantId, data.passId, scanResult.scannedPayload!, user.uid, volunteerName
      );
      setScanResult(prev => prev && prev.data ? { ...prev, data: { ...prev.data, checkedIn: false, participantStatus: 'ready_for_checkin' } } : prev);
    } catch (err: any) {
      alert(err.message || 'Undo failed');
    } finally { setIsProcessing(false); }
  };

  const handleReject = async () => {
    const data = scanResult?.data;
    if (!data || !user) return;
    setIsProcessing(true);
    try {
      await AttendanceService.rejectCheckIn(
        data.participantId, data.passId, scanResult.scannedPayload!, user.uid, volunteerName, 'Volunteer Rejected Check-in'
      );
      alert('Check-in Rejected.');
      resetScanner();
    } catch (err: any) {
      alert(err.message || 'Reject failed');
    } finally { setIsProcessing(false); }
  };

  const handleAdvanceTeam = async () => {
    const data = scanResult?.data;
    if (!data?.teamId || !user) return;
    if (!window.confirm(`Advance team ${data.teamName} to the next round?`)) return;
    setIsProcessing(true);
    try {
      await TeamService.advanceTeam(data.teamId, user.uid);
      alert('Team advanced successfully.');
      resetScanner();
    } catch (e: any) { alert('Failed to advance team: ' + e.message); } finally { setIsProcessing(false); }
  };

  const handleReturnTeam = async () => {
    const data = scanResult?.data;
    if (!data?.teamId || !user) return;
    if (!window.confirm(`Return team ${data.teamName} to the previous round?`)) return;
    setIsProcessing(true);
    try {
      await TeamService.returnTeam(data.teamId, user.uid);
      alert('Team returned successfully.');
      resetScanner();
    } catch (e: any) { alert('Failed to return team: ' + e.message); } finally { setIsProcessing(false); }
  };

  const handleHoldTeam = async () => {
    const data = scanResult?.data;
    if (!data?.teamId || !user) return;
    if (!window.confirm(`Put team ${data.teamName} on hold?`)) return;
    setIsProcessing(true);
    try {
      await TeamService.holdTeam(data.teamId, user.uid);
      alert('Team is now on hold.');
      resetScanner();
    } catch (e: any) { alert('Failed to hold team: ' + e.message); } finally { setIsProcessing(false); }
  };

  const handleEliminateTeam = async () => {
    const data = scanResult?.data;
    if (!data?.teamId || !user) return;
    const reason = prompt("Enter reason for team elimination (e.g., Rule Violation, Absent):");
    if (!reason) return;
    if (!window.confirm(`Are you absolutely sure you want to eliminate team ${data.teamName}?`)) return;
    setIsProcessing(true);
    try {
      await TeamService.eliminateTeam(data.teamId, reason, user.uid);
      alert('Team has been eliminated.');
      resetScanner();
    } catch (e: any) { alert('Failed to eliminate team: ' + e.message); } finally { setIsProcessing(false); }
  };

  const handleUndoElimination = async () => {
    const data = scanResult?.data;
    if (!data?.teamId || !user) return;
    if (!window.confirm(`Are you sure you want to restore team ${data.teamName} to active status?`)) return;
    setIsProcessing(true);
    try {
      await TeamService.restoreTeam(data.teamId, user.uid);
      alert('Team has been restored.');
      resetScanner();
    } catch (e: any) { alert('Failed to restore team: ' + e.message); } finally { setIsProcessing(false); }
  };

  const handleRevokePass = async () => {
    const data = scanResult?.data;
    if (!data?.passId || !user) return;
    const reason = prompt("Enter reason for revoking pass:");
    if (!reason) return;
    if (!window.confirm(`Are you sure you want to revoke this pass?`)) return;
    setIsProcessing(true);
    try {
      await AttendanceService.revokePass(data.passId, user.uid, reason);
      alert('Pass revoked.');
      resetScanner();
    } catch (e: any) { alert('Failed to revoke pass: ' + e.message); } finally { setIsProcessing(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="text-center">
        <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center justify-center gap-3">
          <ScanLine className="w-8 h-8 text-primary" /> DIGITAL PASS SCANNER
        </h2>
        <p className="font-inter text-gray-400 mt-2">Scan participant QR codes for entry validation.</p>
      </div>

      {!scanResult ? (
        <Card className="p-4 overflow-hidden border-primary/20 bg-black relative">
          <div id="qr-reader" className="w-full rounded-lg overflow-hidden [&_video]:w-full [&_video]:rounded-lg" />
          {isProcessing && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-bebas text-xl text-primary tracking-widest animate-pulse">VALIDATING PASS...</p>
            </div>
          )}
        </Card>
      ) : (
        <Card className={`p-6 text-center ${
          scanResult.success ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'
        }`}>
          {scanResult.success && scanResult.data ? (
            <div className="space-y-6 flex flex-col items-center">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
              <h3 className="font-bebas text-3xl text-green-400">VALID PASS</h3>
              
              <div className="bg-black/50 p-6 rounded-xl border border-green-500/20 w-full text-left space-y-4">
                <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                  {scanResult.data.photoUrl ? (
                    <img src={scanResult.data.photoUrl} className="w-12 h-12 rounded-full object-cover border border-white/10" alt="Avatar" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bebas text-2xl text-white tracking-wide">{scanResult.data.name}</h4>
                    <p className="font-inter text-sm text-gray-400">{scanResult.data.college}</p>
                    <p className="font-mono text-xs text-primary mt-1">ID: {scanResult.data.glitchId} | REG: {scanResult.data.registrationId}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-inter text-gray-500 block mb-1">TEAM</span>
                    <span className="font-inter text-white">{scanResult.data.teamName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs font-inter text-gray-500 block mb-1">TEAM STATUS</span>
                    {scanResult.data.teamDisqualified ? (
                      <Badge variant="danger">DISQUALIFIED</Badge>
                    ) : scanResult.data.teamEliminated ? (
                      <Badge variant="danger">ELIMINATED</Badge>
                    ) : (
                      <Badge variant="outline">ROUND {scanResult.data.currentRound}</Badge>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-inter text-gray-500 block mb-1">PASS STATUS</span>
                    <Badge variant={scanResult.data.digitalPassStatus === 'active' ? 'success' : 'danger'}>
                      {scanResult.data.digitalPassStatus.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-xs font-inter text-gray-500 block mb-1">CHECK-IN STATUS</span>
                    <span className="text-white text-sm font-medium capitalize">{scanResult.data.participantStatus.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                {scanResult.data.checkedIn && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-green-400 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Already Checked In at {scanResult.data.lastCheckInTime ? new Date(scanResult.data.lastCheckInTime).toLocaleTimeString() : ''}</p>
                  </div>
                )}

                {scanResult.data.teamEliminated && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-red-400 font-bold flex items-center gap-2"><XCircle className="w-5 h-5" /> TEAM ELIMINATED</p>
                    </div>
                )}

                <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-white/10">
                  {!scanResult.data.checkedIn ? (
                    <>
                      <Button onClick={handleApprove} className="w-full" disabled={isProcessing}>
                        Approve Check-in
                      </Button>
                      <Button onClick={handleReject} variant="danger" className="w-full" disabled={isProcessing}>
                        Reject
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleUndoCheckIn} variant="outline" className="w-full" disabled={isProcessing}>
                      Undo Check-in
                    </Button>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {scanResult.data.teamId && (
                      <>
                        {!scanResult.data.teamEliminated && !scanResult.data.teamDisqualified && (
                          <>
                            <Button onClick={handleAdvanceTeam} variant="outline" className="w-full text-xs" disabled={isProcessing}>
                              Advance Team
                            </Button>
                            <Button onClick={handleReturnTeam} variant="outline" className="w-full text-xs" disabled={isProcessing}>
                              Return Team
                            </Button>
                            <Button onClick={handleHoldTeam} variant="outline" className="w-full text-xs" disabled={isProcessing}>
                              Hold Team
                            </Button>
                            <Button onClick={handleEliminateTeam} variant="danger" className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs" disabled={isProcessing}>
                              Eliminate Team
                            </Button>
                          </>
                        )}
                        {(scanResult.data.teamEliminated || scanResult.data.teamDisqualified) && (
                          <Button onClick={handleUndoElimination} variant="outline" className="w-full text-xs col-span-2" disabled={isProcessing}>
                            Undo Elimination (Restore)
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  <Button onClick={handleRevokePass} variant="danger" className="w-full mt-2" disabled={isProcessing}>
                    Revoke Pass
                  </Button>
                  
                  <Button onClick={resetScanner} variant="ghost" className="w-full mt-4" disabled={isProcessing}>
                    Scan Another
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 flex flex-col items-center py-8">
              <XCircle className="w-20 h-20 text-red-500 mx-auto" />
              <div>
                <h3 className="font-bebas text-3xl text-red-400">INVALID PASS</h3>
                <p className="font-inter text-red-300 mt-2">{scanResult.reason}</p>
              </div>
            </div>
          )}

          {!scanResult.success && (
            <Button 
              variant="outline"
              className="w-full mt-8 h-14 font-bebas text-xl tracking-widest border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={resetScanner}
            >
              SCAN NEXT PASS
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
