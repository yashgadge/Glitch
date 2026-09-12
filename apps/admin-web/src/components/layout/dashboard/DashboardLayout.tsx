import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import type { NavItem } from './Sidebar';;
import { TopNavigation } from './TopNavigation';
import { cn } from '../../ui/Card';
import { WifiOff } from 'lucide-react';

interface DashboardLayoutProps {
  navItems: NavItem[];
  children: React.ReactNode;
  pageTitle?: string;
  roundName?: string;
}

export function DashboardLayout({ navItems, children, pageTitle, roundName }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden text-gray-200">
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">
        <Sidebar 
          items={navItems}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar 
          items={navItems}
          collapsed={false}
          onToggle={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <TopNavigation 
          title={pageTitle}
          roundName={roundName}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />
        
        {isOffline && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-center gap-2 text-red-400 font-inter text-sm z-30">
            <WifiOff className="w-4 h-4" />
            <span>You are offline. Some actions may be unavailable.</span>
          </div>
        )}
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
