import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { Download, RefreshCw, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { Button } from '../ui/Button';
import { useEventEngine } from '@shared/contexts/EventContext';

interface DigitalPassProps {
  participantData: {
    participantId: string;
    name: string;
    teamName?: string;
    track?: string;
    college?: string;
    status: string;
    role: string;
    qrData: string;
  };
}

export default function DigitalPass({ participantData }: DigitalPassProps) {
  const { config } = useEventEngine();
  const passRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPDF = async () => {
    if (!passRef.current) return;
    setIsGeneratingPdf(true);
    
    const element = passRef.current;
    
    const opt = {
      margin:       0.5,
      filename:     `GLITCH36_Pass_${participantData.participantId}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#0a0a0a' },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'active':
      case 'verified': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'pending': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'blocked': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const initials = participantData.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col items-center max-w-md mx-auto w-full">
      {/* The Pass Card */}
      <motion.div 
        ref={passRef}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full rounded-[2rem] overflow-hidden bg-[#0a0a0a] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-[#0a0a0a] to-[#0a0a0a] opacity-80" />
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl" />
        
        <div className="relative p-6 sm:p-8 z-10 flex flex-col items-center">
          
          {/* Header */}
          <div className="w-full flex justify-between items-start mb-6">
            <div>
              <h2 className="font-bebas text-3xl tracking-widest text-white leading-none">GLITCH 36</h2>
              <span className="font-mono text-xs text-primary uppercase tracking-widest block mt-1">Official Digital Pass</span>
            </div>
            <div className={`px-3 py-1 rounded-full border text-xs font-mono font-bold tracking-wider ${getStatusColor(participantData.status)} flex items-center gap-1.5`}>
              {participantData.status === 'Active' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {participantData.status?.toUpperCase() || 'PENDING'}
            </div>
          </div>

          {/* Profile Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-purple-600 p-1 mb-4 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]">
              <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center">
                <span className="font-bebas text-4xl text-white">{initials}</span>
              </div>
            </div>
            <h3 className="font-inter text-2xl font-bold text-white text-center mb-1">{participantData.name}</h3>
            <span className="font-mono text-primary text-sm tracking-widest">{participantData.participantId}</span>
          </div>

          {/* QR Code Section */}
          <div className="relative bg-white p-4 rounded-2xl mb-8 shadow-xl mx-auto">
            {/* Scanning Pulse Animation */}
            <div className="absolute inset-0 border-2 border-primary rounded-2xl opacity-0 animate-[pulse_3s_ease-in-out_infinite]" />
            <QRCodeSVG 
              value={participantData.qrData} 
              size={180}
              level="H"
              includeMargin={false}
              className="rounded-lg"
            />
          </div>

          {/* Information Chips */}
          <div className="w-full grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md">
              <span className="block font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-1">ROLE</span>
              <span className="font-inter text-sm text-white font-medium capitalize">{participantData.role}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md">
              <span className="block font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-1">TEAM</span>
              <span className="font-inter text-sm text-white font-medium truncate">{participantData.teamName || 'N/A'}</span>
            </div>
            {participantData.track && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md col-span-2">
                <span className="block font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-1">TRACK</span>
                <span className="font-inter text-sm text-white font-medium">{participantData.track}</span>
              </div>
            )}
            {participantData.college && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md col-span-2">
                <span className="block font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-1">COLLEGE</span>
                <span className="font-inter text-sm text-white font-medium truncate">{participantData.college}</span>
              </div>
            )}
          </div>

          {/* Footer Event Details */}
          <div className="w-full flex items-center justify-between pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-gray-400">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-inter text-xs">{config?.venue || 'Main Campus Arena'}</span>
            </div>
            <span className="font-mono text-[10px] text-gray-500">{config?.edition || '2026 EDITION'}</span>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="w-full mt-6 grid grid-cols-2 gap-4">
        <Button 
          variant="outline" 
          className="w-full font-bebas tracking-widest text-lg"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="w-4 h-4 mr-2" /> REFRESH
        </Button>
        <Button 
          variant="primary" 
          className="w-full font-bebas tracking-widest text-lg"
          onClick={handleDownloadPDF}
          disabled={isGeneratingPdf}
        >
          {isGeneratingPdf ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {isGeneratingPdf ? 'SAVING...' : 'SAVE PDF'}
        </Button>
      </div>
    </div>
  );
}
