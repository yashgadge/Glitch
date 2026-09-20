import React from 'react';
import { LogOut, Menu, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from "../../contexts/AuthContext";

interface TopNavigationProps {
  title?: string;
  onMobileMenuToggle: () => void;
  className?: string;
}

export function TopNavigation({ title, onMobileMenuToggle, className }: TopNavigationProps) {
  const { logout, user, role } = useAuth();

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
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium text-white font-inter">{user?.email?.split('@')[0] || 'User'}</span>
            <span className="text-xs text-primary font-inter capitalize">{role || 'Volunteer'}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <User className="w-4 h-4 text-gray-300" />
          </div>
        </div>

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
