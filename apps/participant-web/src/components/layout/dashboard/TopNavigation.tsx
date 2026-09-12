import React, { useState, useEffect } from 'react';
import { Search, Bell, LogOut, Menu, User, RefreshCw } from 'lucide-react';
import { cn } from '../../ui/Card';
import { useAuth } from '@shared/contexts/AuthContext';
import { AnnouncementService } from '@shared/services/AnnouncementService';
import { useNavigate } from 'react-router-dom';

interface TopNavigationProps {
  title?: string;
  onMobileMenuToggle: () => void;
  className?: string;
  roundName?: string;
}

export function TopNavigation({ title, onMobileMenuToggle, className, roundName }: TopNavigationProps) {
  const { logout, user, activeRole, availableRoles, switchActiveRole } = useAuth();
  const navigate = useNavigate();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!activeRole) return;
    const unsub = AnnouncementService.subscribeToAnnouncements(activeRole, (data) => {
      if (data.length > 0) {
        const latestTime = new Date(data[0].timestamp).getTime();
        const lastViewed = localStorage.getItem(`last_viewed_announcements_${activeRole}`);
        if (!lastViewed || latestTime > parseInt(lastViewed, 10)) {
          setHasUnread(true);
        } else {
          setHasUnread(false);
        }
      } else {
        setHasUnread(false);
      }
    });
    return () => unsub();
  }, [activeRole]);

  const handleBellClick = () => {
    if (activeRole) {
      localStorage.setItem(`last_viewed_announcements_${activeRole}`, Date.now().toString());
    }
    setHasUnread(false);
    navigate('/participant/announcements');
  };

  return (
    <header className={cn("h-16 bg-[#111111]/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30", className)}>
      <div className="flex items-center gap-4">
        <button 
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 -ml-2 rounded-lg bg-white/5 text-gray-400 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        {title && <h1 className="text-lg font-medium text-white font-inter">{title}</h1>}
      </div>

      <div className="flex items-center gap-4 lg:gap-6">
        {roundName && (
          <div className="hidden md:flex items-center px-3 py-1 bg-white/5 border border-white/10 rounded-full">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse mr-2"></span>
            <span className="text-xs font-inter text-gray-300 font-medium tracking-wide">{roundName}</span>
          </div>
        )}

        <div className="relative hidden sm:block w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm font-inter text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>

        <button 
          onClick={handleBellClick}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          {hasUnread && <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse"></span>}
        </button>

        <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium text-white font-inter">{user?.email?.split('@')[0] || 'User'}</span>
            <span className="text-xs text-gray-500 font-inter capitalize">{activeRole?.replace('_', ' ') || 'Guest'}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <User className="w-4 h-4 text-gray-300" />
          </div>
        </div>

        {availableRoles.length > 1 && (
          <button 
            onClick={() => switchActiveRole(null as any)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Switch Workspace"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        )}

        <button 
          onClick={() => logout()}
          className="p-2 rounded-lg text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
