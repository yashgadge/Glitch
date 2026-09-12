import React from 'react';
import { Outlet } from 'react-router-dom';
import { useEventEngine } from '@shared/contexts/EventContext';
import { useAuth } from '@shared/contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';

export default function MaintenanceGuard() {
  const { config, loading: configLoading } = useEventEngine();
  const { role, loading: authLoading } = useAuth();

  if (configLoading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Admins and Organizers bypass maintenance mode
  const canBypass = role === 'super_admin' || role === 'organizer';

  if (config?.maintenanceMode && !canBypass) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <ShieldAlert className="w-20 h-20 text-primary mb-6 animate-pulse" />
        <h1 className="font-bebas text-6xl tracking-widest text-white mb-4 text-center">SYSTEM MAINTENANCE</h1>
        <p className="font-inter text-gray-400 text-center max-w-lg mb-8">
          GLITCH 36 is currently undergoing scheduled maintenance. Please check back later. Organizers and Admins may still log in via their direct portal URLs.
        </p>
        <a href="mailto:support@glitch36.com" className="text-primary hover:text-white transition-colors font-inter text-sm">
          Contact Support
        </a>
      </div>
    );
  }

  return <Outlet />;
}

