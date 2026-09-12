import React, { useEffect, useState } from 'react';
import { Settings, Users, UserPlus, School, Trophy, QrCode, TerminalSquare, AlertCircle, BarChart3, Clock, ShieldCheck, Ticket, Download, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { EventConfigService } from '@shared/services/EventConfigService';
import { RoundService } from '@shared/services/RoundService';
import { db } from '@shared/lib/firebase';
import { writeBatch, doc } from 'firebase/firestore';
import { hackathonTracks, hackathonProblems } from './hackathonData';
import { useToast } from '../../../components/ui/ToastContext';
import type { EventConfig, Round } from '@shared/types/models';

export default function AdminHome() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [activeRound, setActiveRound] = useState<Round | null>(null);

  useEffect(() => {
    const unsubConfig = EventConfigService.subscribeToConfig(setConfig);
    const unsubRound = RoundService.subscribeToActiveRound(setActiveRound);
    return () => {
      unsubConfig();
      unsubRound();
    };
  }, []);

  const handleExport = () => {
    success('Export Started', 'Generating complete system report...');
  };

  const handleImportData = async () => {
    if (!window.confirm("Import 6 tracks and 24 problem statements?")) return;
    try {
      const batch = writeBatch(db);
      hackathonTracks.forEach(track => {
        batch.set(doc(db, 'tracks', track.id), {
          ...track,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
      hackathonProblems.forEach(problem => {
        batch.set(doc(db, 'problemStatements', problem.id), {
          ...problem,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
      success('Import Complete', 'Tracks and Problems imported successfully.');
    } catch (e: any) {
      toastError('Import Failed', e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" /> COMMAND CENTER
          </h2>
          <p className="font-inter text-gray-400">Operational Overview for GLITCH 36</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleImportData} className="border-green-500/30 text-green-400 hover:bg-green-500/10">
            IMPORT DATA
          </Button>
          <Button variant="outline" leftIcon={Download} onClick={handleExport}>
            SYSTEM REPORT
          </Button>
          <Button variant="outline" leftIcon={TerminalSquare} onClick={() => navigate('/workspace/command-center')}>
            Open Console
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Event Status Card */}
        <Card className="p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-inter font-medium text-gray-400 text-sm">Registration Status</h3>
            <div className={`p-2 rounded-lg ${config?.isRegistrationOpen ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
              <Settings className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-inter mt-1">Registration: {config?.isRegistrationOpen ? 'Open' : 'Closed'}</p>
          </div>
        </Card>

        {/* Current Round Card */}
        <Card className="p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-inter font-medium text-gray-400 text-sm">Active Round</h3>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bebas tracking-wide text-white">
              {activeRound ? activeRound.displayName : 'NO ACTIVE ROUND'}
            </p>
            <p className="text-xs text-gray-500 font-inter mt-1">
              {activeRound?.evaluationOpen ? 'Evaluations Open' : 'Evaluations Closed'}
            </p>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between min-h-[140px] col-span-1 md:col-span-2 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
           <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/20 rounded-xl text-primary shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-1 font-inter">System Status: Online</h3>
                <p className="text-sm text-gray-400 font-inter max-w-md">
                  Backend architecture is frozen and operational. All services are currently responding correctly.
                </p>
              </div>
           </div>
        </Card>
      </div>

      <h3 className="font-bebas text-2xl tracking-wide text-white mt-8 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <button 
          onClick={() => navigate('/workspace/import')}
          className="flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all group"
        >
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/20 group-hover:text-primary transition-colors text-gray-400">
             <Users className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-300 font-inter text-center">Import<br/>Participants</span>
        </button>

        <button 
          onClick={() => navigate('/workspace/staff')}
          className="flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all group"
        >
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/20 group-hover:text-primary transition-colors text-gray-400">
             <UserPlus className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-300 font-inter text-center">Manage<br/>Staff</span>
        </button>

        <button 
          onClick={() => navigate('/workspace/classrooms')}
          className="flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all group"
        >
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/20 group-hover:text-primary transition-colors text-gray-400">
             <School className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-300 font-inter text-center">Manage<br/>Classrooms</span>
        </button>

        <button 
          onClick={() => navigate('/workspace/results')}
          className="flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all group"
        >
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/20 group-hover:text-primary transition-colors text-gray-400">
             <Trophy className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-300 font-inter text-center">Publish<br/>Results</span>
        </button>

        <button 
          onClick={() => navigate('/workspace/digital-pass')}
          className="flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all group"
        >
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/20 group-hover:text-primary transition-colors text-gray-400">
             <QrCode className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-300 font-inter text-center">Generate<br/>Passes</span>
        </button>
        
        <button 
          onClick={() => navigate('/workspace/settings')}
          className="flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all group"
        >
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/20 group-hover:text-primary transition-colors text-gray-400">
             <Settings className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-300 font-inter text-center">Event<br/>Settings</span>
        </button>

      </div>
    </div>
  );
}
