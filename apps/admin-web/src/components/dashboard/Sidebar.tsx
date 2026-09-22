import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ROLE_CONFIG } from '@shared/config/roles';
import { useAuth } from '@shared/contexts/AuthContext';
import { LogOut } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { role, logout } = useAuth();
  const location = useLocation();

  const config = role ? ROLE_CONFIG[role] : null;
  const sidebarItems = config?.sidebar || [];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <motion.aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#0a0a0a]/95 backdrop-blur-xl border-r border-white/10 z-50 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Brand */}
        <div className="h-20 flex items-center px-6 border-b border-white/10 shrink-0">
          <Link to="/" className="flex items-center group">
            <span className="font-bebas text-3xl text-white tracking-wider drop-shadow-md group-hover:text-primary transition-colors">PANDORA</span>
            <span className="font-inter font-light text-[0.5em] text-gray-400 mx-2 uppercase mt-1">X</span>
            <span className="font-bebas text-3xl text-white tracking-wider drop-shadow-md group-hover:text-primary transition-colors">GLITCH</span>
            <span className="font-bebas text-lg text-primary ml-1 mt-1 drop-shadow-md group-hover:text-white transition-colors">36</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            
            return (
              <Link 
                key={item.path} 
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-inter text-sm font-medium transition-all group relative overflow-hidden ${
                  isActive 
                    ? 'text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-primary/20 border border-primary/50 rounded-lg -z-10"
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                  />
                )}
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'text-primary' : 'group-hover:scale-110'}`} />
                <span className="tracking-wide">{item.title}</span>
              </Link>
            );
          })}
        </div>

        {/* User / Logout */}
        <div className="p-4 border-t border-white/10 shrink-0">
          <button 
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg font-inter text-sm font-medium text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="tracking-wide">LOGOUT</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
