import React, { useState, useEffect } from 'react';
import { Menu, Bell, Search, User } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { AnnouncementService } from '@shared/services/AnnouncementService';
import { NotificationService } from '@shared/services/NotificationService';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  setSidebarOpen: (isOpen: boolean) => void;
  title?: string;
}

export default function Topbar({ setSidebarOpen, title = 'DASHBOARD' }: TopbarProps) {
  const { user, role } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const navigate = useNavigate();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!role || !user) return;
    
    let combined: any[] = [];
    let annUnsub: () => void;
    let notifUnsub: () => void;

    const updateCombined = (ann: any[], notifs: any[]) => {
      const merged = [...ann, ...notifs].sort((a, b) => {
        const timeA = new Date(a.timestamp || a.createdAt).getTime();
        const timeB = new Date(b.timestamp || b.createdAt).getTime();
        return timeB - timeA;
      });
      
      setNotifications(merged.slice(0, 5)); // show top 5 in dropdown
      
      if (merged.length > 0) {
        const latestTime = new Date(merged[0].timestamp || merged[0].createdAt).getTime();
        const lastViewed = localStorage.getItem(`last_viewed_announcements_${role}`);
        if (!lastViewed || latestTime > parseInt(lastViewed, 10)) {
          setHasUnread(true);
        } else {
          setHasUnread(false);
        }
      } else {
        setHasUnread(false);
      }
    };

    let currentAnnouncements: any[] = [];
    let currentNotifs: any[] = [];

    annUnsub = AnnouncementService.subscribeToAnnouncements(role, (data) => {
      currentAnnouncements = data;
      updateCombined(currentAnnouncements, currentNotifs);
    });

    notifUnsub = NotificationService.subscribeToPersonalNotifications(user.uid, (data) => {
      currentNotifs = data;
      updateCombined(currentAnnouncements, currentNotifs);
    });

    return () => {
      annUnsub();
      notifUnsub();
    };
  }, [role, user]);

  const handleBellClick = () => {
    setNotificationsOpen(!notificationsOpen);
    if (!notificationsOpen && role) {
      localStorage.setItem(`last_viewed_announcements_${role}`, Date.now().toString());
      setHasUnread(false);
    }
  };

  return (
    <header className="h-20 bg-black/50 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="font-bebas text-2xl lg:text-3xl tracking-widest text-white hidden sm:block">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-4 lg:gap-6">
        {/* Search Placeholder */}
        <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-2 w-64 focus-within:border-primary/50 focus-within:bg-white/10 transition-colors">
          <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Search network..." 
            className="bg-transparent border-none outline-none text-sm font-inter text-white w-full placeholder-gray-500"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button 
            className="relative p-2 text-gray-400 hover:text-white transition-colors"
            onClick={handleBellClick}
          >
            <Bell className="w-5 h-5" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute top-12 right-0 w-80 max-h-96 overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl z-50">
              <div className="p-3 border-b border-white/10 font-bebas text-lg tracking-widest text-white sticky top-0 bg-[#1a1a1a]">
                NOTIFICATIONS
              </div>
              <div className="p-2 space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-center font-inter text-xs text-gray-500 py-4">All caught up!</p>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-3 rounded-lg border bg-primary/5 border-primary/20 cursor-pointer hover:bg-white/10 transition-colors`}
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigate('/participant/announcements');
                      }}
                    >
                      <h4 className="font-bebas text-sm text-primary flex justify-between">
                        {n.title}
                        {n.priority === 'high' && <span className="text-red-500 text-[10px]">HIGH</span>}
                      </h4>
                      <p className="font-inter text-xs text-gray-300 mt-1 line-clamp-2">{n.content}</p>
                    </div>
                  ))
                )}
                {notifications.length > 0 && (
                  <button 
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate('/participant/announcements');
                    }}
                    className="w-full mt-2 py-2 text-xs font-inter text-gray-400 hover:text-white transition-colors text-center border-t border-white/10"
                  >
                    View All Announcements
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3 pl-4 border-l border-white/10 cursor-pointer group">
          <div className="hidden sm:flex flex-col items-end">
            <span className="font-inter text-sm font-bold text-white group-hover:text-primary transition-colors">
              {user?.displayName || 'OPERATIVE'}
            </span>
            <span className="font-inter text-[10px] tracking-widest text-gray-400 uppercase">
              {role || 'GUEST'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
