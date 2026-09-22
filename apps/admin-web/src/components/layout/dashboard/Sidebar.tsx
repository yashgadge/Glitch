import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { cn } from '../../ui/Card';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  end?: boolean;
}

interface SidebarProps {
  items: NavItem[];
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

export function Sidebar({ items, collapsed, onToggle, className }: SidebarProps) {
  return (
    <aside 
      className={cn(
        "flex flex-col h-full bg-[#111111] border-r border-white/10 transition-all duration-300 z-40 relative",
        collapsed ? "w-20" : "w-64",
        className
      )}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
        <div className={cn("flex items-center gap-2 overflow-hidden transition-all", collapsed ? "w-0 opacity-0" : "w-full opacity-100")}>
          <Link to="/workspace" className="flex items-center group">
            <span className="font-bebas text-xl tracking-widest text-white mt-1 shrink-0">PANDORA</span>
            <span className="font-inter font-light text-[0.4em] text-gray-400 mx-1 uppercase mt-1 shrink-0">X</span>
            <span className="font-bebas text-xl tracking-widest text-white mt-1 shrink-0">GLITCH 36</span>
          </Link>
        </div>
        
        <button 
          onClick={onToggle}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors shrink-0"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-2">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={idx}
              to={item.href}
              end={item.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all font-inter group",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className={cn(
                "whitespace-nowrap transition-all duration-300 font-medium text-sm",
                collapsed ? "opacity-0 w-0 hidden" : "opacity-100 w-auto"
              )}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
