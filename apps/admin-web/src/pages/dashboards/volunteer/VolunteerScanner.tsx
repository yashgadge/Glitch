import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ScanLine, CheckCircle, XCircle, User, MapPin, Camera, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { ParticipantService } from '@shared/services/ParticipantService';
import { AttendanceService } from '@shared/services/AttendanceService';
import type { ScanResultDTO } from '@shared/services/AttendanceService';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

type ScanMode = 'attendance' | 'verify' | 'redemption';

interface ScanResult {
  success: boolean;
  data?: ScanResultDTO;
  reason?: string;
  scannedPayload?: string;
}

export default function VolunteerScanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<ScanMode>('attendance');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'error'>('idle');
  const [cameraErrorMsg, setCameraErrorMsg] = useState('');
  
  const isProcessingRef = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<number>(0);
  const [volunteerName, setVolunteerName] = useState('Volunteer');
  
  const [manualLookupOpen, setManualLookupOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    if (!user) return;
    ParticipantService.getStaffProfile(user.uid).then(p => {
      if (p) setVolunteerName(p.name);
    });

    return () => {
      stopCamera();
    };
  }, [user]);

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping camera", err);
      }
      scannerRef.current = null;
    }
    setCameraStatus('idle');
  };

  const startCamera = async () => {
    setCameraStatus('requesting');
    setScanResult(null);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error("No cameras found on this device.");
      }
      
      const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
      const cameraId = backCamera ? backCamera.id : devices[devices.length - 1].id;

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("qr-reader");
      }
      
      await scannerRef.current.start(
        cameraId,
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          // ON SCAN SUCCESS
          const now = Date.now();
          if (now - lastScanRef.current < 3000) return; // 3 second cooldown
          if (isProcessingRef.current) return;
          
          if (mode === 'redemption') {
            await stopCamera();
            navigate(`/workspace/redemption?payload=${encodeURIComponent(decodedText)}`);
            return;
          }

          lastScanRef.current = now;
          setIsProcessing(true);
          isProcessingRef.current = true;
          
          if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.pause();
          }
          
          try {
            const data = await AttendanceService.fetchScanDetails(decodedText);
            // Critical fix: Wait for camera to fully stop and release DOM node
            // BEFORE setting scanResult which unmounts the element from React tree.
            await stopCamera();
            setScanResult({ success: true, data, scannedPayload: decodedText });
          } catch (err: any) {
            await stopCamera();
            setScanResult({ success: false, reason: err.message || 'Scan processing failed' });
          } finally {
            setIsProcessing(false);
            isProcessingRef.current = false;
          }
        },
        (errorMessage) => {
          // ON SCAN FAILURE (ignored usually)
        }
      );
      setCameraStatus('active');
    } catch (err: any) {
      console.error(err);
      setCameraStatus('denied');
      setCameraErrorMsg(err.message || 'Camera permission denied or unavailable');
    }
  };

  const handleManualLookup = async () => {
    if (!manualCode.trim()) return;
    setManualLookupOpen(false);
    
    if (mode === 'redemption') {
      navigate(`/workspace/redemption?payload=${encodeURIComponent(manualCode.trim())}`);
      return;
    }
    
    setIsProcessing(true);
    try {
      const data = await AttendanceService.fetchScanDetails(manualCode.trim());
      setScanResult({ success: true, data, scannedPayload: manualCode.trim() });
    } catch (err: any) {
      setScanResult({ success: false, reason: err.message || 'Scan processing failed' });
    } finally {
      setIsProcessing(false);
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
      setScanResult(prev => prev && prev.data ? { ...prev, data: { ...prev.data, checkedIn: true, participantStatus: 'checked_in', lastCheckInTime: new Date().toISOString() } } : prev);
    } catch (err: any) {
      alert(err.message || 'Approve failed');
    } finally { setIsProcessing(false); }
  };

  const handleUndoCheckIn = async () => {
    const data = scanResult?.data;
    if (!data || !user) return;
    if (!window.confirm('Are you sure you want to undo this check-in?')) return;
    setIsProcessing(true);
    try {
      await AttendanceService.undoCheckIn(
        data.participantId, data.passId, scanResult.scannedPayload!, user.uid, volunteerName
      );
      setScanResult(prev => prev && prev.data ? { ...prev, data: { ...prev.data, checkedIn: false, participantStatus: 'ready_for_checkin', lastCheckInTime: null } } : prev);
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
      setScanResult(null); // Clear result before restarting camera
      startCamera();
    } catch (err: any) {
      alert(err.message || 'Reject failed');
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="text-center">
        <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center justify-center gap-3">
          <ScanLine className="w-8 h-8 text-primary" /> DIGITAL PASS SCANNER
        </h2>
      </div>

      {!scanResult && (
        <div className="flex justify-center gap-2 mb-4 bg-gray-900/50 p-2 rounded-lg border border-gray-800 w-max mx-auto">
          <button 
            className={`px-4 py-2 rounded-md font-bebas text-lg tracking-wider transition-colors ${mode === 'attendance' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setMode('attendance')}
            disabled={cameraStatus === 'active' || cameraStatus === 'requesting'}
          >
            ATTENDANCE
          </button>
          <button 
            className={`px-4 py-2 rounded-md font-bebas text-lg tracking-wider transition-colors ${mode === 'verify' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setMode('verify')}
            disabled={cameraStatus === 'active' || cameraStatus === 'requesting'}
          >
            VERIFY
          </button>
          <button 
            className={`px-4 py-2 rounded-md font-bebas text-lg tracking-wider transition-colors ${mode === 'redemption' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setMode('redemption')}
            disabled={cameraStatus === 'active' || cameraStatus === 'requesting'}
          >
            REDEMPTION
          </button>
        </div>
      )}

      {!scanResult ? (
        <Card className="p-4 border-primary/20 bg-black relative">
          <div className="min-h-[300px] flex flex-col items-center justify-center relative">
            <div id="qr-reader-container" className="relative w-full max-w-sm mx-auto">
              <div id="qr-reader" className={`w-full rounded-lg overflow-hidden [&_video]:w-full [&_video]:rounded-lg ${cameraStatus === 'active' || cameraStatus === 'requesting' ? 'block' : 'hidden'}`}></div>
              
              {cameraStatus === 'requesting' && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 rounded-lg">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-primary font-bebas text-xl tracking-widest animate-pulse text-center">INITIALIZING<br/>CAMERA...</p>
                </div>
              )}
            </div>
            
            {cameraStatus === 'idle' && (
              <div className="text-center space-y-4 py-12">
                <Camera className="w-16 h-16 text-gray-600 mx-auto" />
                <p className="text-gray-400 font-inter">Camera is offline</p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <Button onClick={startCamera} className="font-bebas tracking-widest text-lg px-8">
                    START SCANNER
                  </Button>
                  <Button variant="outline" onClick={() => { setManualCode(''); setManualLookupOpen(true); }} className="font-bebas tracking-widest text-lg px-8 text-gray-300">
                    MANUAL LOOKUP
                  </Button>
                </div>
              </div>
            )}

            {cameraStatus === 'denied' && (
              <div className="text-center space-y-4 py-12">
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
                <p className="text-red-400 font-bebas text-2xl tracking-widest">CAMERA PERMISSION DENIED</p>
                <p className="text-gray-400 font-inter text-sm max-w-xs text-center mx-auto">{cameraErrorMsg}</p>
                <Button onClick={startCamera} variant="outline" className="border-red-500 text-red-400 mt-4">
                  <RefreshCw className="w-4 h-4 mr-2" /> TRY AGAIN
                </Button>
              </div>
            )}

            {cameraStatus === 'active' && (
              <Button onClick={stopCamera} variant="outline" className="absolute top-4 right-4 bg-black/50 border-gray-600 hover:bg-black/80 z-20">
                STOP
              </Button>
            )}
          </div>
          
          {isProcessing && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30 rounded-lg">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-bebas text-xl text-primary tracking-widest animate-pulse">VALIDATING PASS...</p>
            </div>
          )}
        </Card>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={scanResult.success ? 'success' : 'failure'}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className={`p-6 border ${scanResult.success ? 'border-green-500/30 bg-green-900/10' : 'border-red-500/30 bg-red-900/10'}`}>
              <div className="text-center mb-6">
                {scanResult.success ? (
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />
                ) : (
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-2" />
                )}
                <h3 className={`font-bebas text-3xl tracking-wide ${scanResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {scanResult.success ? 'VALID PASS DECODED' : 'INVALID OR REJECTED'}
                </h3>
                {!scanResult.success && scanResult.reason && (
                  <p className="font-inter text-red-400/80 mt-2">{scanResult.reason}</p>
                )}
              </div>

              {scanResult.success && scanResult.data && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-black/40 rounded-lg border border-white/5">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <h4 className="font-bebas text-2xl text-white">{scanResult.data.participantName}</h4>
                      <p className="font-mono text-primary text-sm">{scanResult.data.participantId}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-black/40 rounded border border-white/5">
                      <span className="text-[10px] text-gray-500 font-inter uppercase tracking-widest block">TEAM</span>
                      <span className="font-bebas text-lg text-white block mt-1">{scanResult.data.teamName || 'NO TEAM'}</span>
                      <span className="font-mono text-xs text-gray-400">{scanResult.data.teamId || '-'}</span>
                    </div>
                    <div className="p-3 bg-black/40 rounded border border-white/5">
                      <span className="text-[10px] text-gray-500 font-inter uppercase tracking-widest block">PASS STATUS</span>
                      <Badge variant={scanResult.data.passStatus === 'ACTIVE' ? 'success' : 'danger'} className="mt-1">
                        {scanResult.data.passStatus}
                      </Badge>
                    </div>
                  </div>

                  {mode === 'attendance' && (
                    <div className="pt-4 border-t border-white/10 flex justify-center gap-4">
                      {!scanResult.data.checkedIn ? (
                        <Button 
                          className="bg-green-600 hover:bg-green-500 text-white font-bebas text-xl px-8" 
                          onClick={handleApprove}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'PROCESSING...' : 'APPROVE CHECK-IN'}
                        </Button>
                      ) : (
                        <div className="text-center w-full">
                          <p className="text-green-500 font-bebas text-xl mb-3 flex items-center justify-center gap-2">
                            <CheckCircle className="w-5 h-5" /> ALREADY CHECKED IN
                          </p>
                          <Button 
                            variant="outline" 
                            className="text-red-400 border-red-500/30 hover:bg-red-500/10" 
                            onClick={handleUndoCheckIn}
                            disabled={isProcessing}
                          >
                            UNDO CHECK-IN
                          </Button>
                        </div>
                      )}
                      
                      {!scanResult.data.checkedIn && (
                        <Button 
                          variant="outline"
                          className="text-red-400 border-red-500/30 hover:bg-red-500/10 font-bebas text-xl px-8" 
                          onClick={handleReject}
                          disabled={isProcessing}
                        >
                          REJECT
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 text-center">
                <Button variant="ghost" onClick={() => { setScanResult(null); startCamera(); }} className="text-gray-400">
                  <RefreshCw className="w-4 h-4 mr-2" /> SCAN ANOTHER
                </Button>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      <Modal isOpen={manualLookupOpen} onClose={() => setManualLookupOpen(false)} title="MANUAL LOOKUP">
        <div className="space-y-4">
          <p className="text-gray-400 font-inter text-sm">Enter the Participant ID or QR Code payload to manually process an action.</p>
          <input 
            type="text" 
            placeholder="Participant ID (e.g. GL26-P-...)"
            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white font-inter text-lg focus:outline-none focus:border-primary transition-colors"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setManualLookupOpen(false)}>CANCEL</Button>
            <Button onClick={handleManualLookup} disabled={!manualCode.trim() || isProcessing}>
              {isProcessing ? 'PROCESSING...' : 'LOOKUP'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
