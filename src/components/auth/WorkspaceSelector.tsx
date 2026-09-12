import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, TerminalSquare, CheckSquare, Users, UserPlus, LogOut } from 'lucide-react';
import { useAuth, type UserRole } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const roleMeta: Record<string, { title: string; description: string; icon: React.ElementType }> = {
  super_admin: {
    title: 'Command Center',
    description: 'Full system access and override capabilities.',
    icon: ShieldAlert
  },
  organizer: {
    title: 'Organizer Dashboard',
    description: 'Manage participants, rounds, and communications.',
    icon: TerminalSquare
  },
  judge: {
    title: 'Evaluation Portal',
    description: 'Score teams and submit hackathon evaluations.',
    icon: CheckSquare
  },
  mentor: {
    title: 'Mentor Hub',
    description: 'Assist teams and track mentoring sessions.',
    icon: Users
  },
  volunteer: {
    title: 'Volunteer Station',
    description: 'Manage check-ins, meals, and on-ground logistics.',
    icon: UserPlus
  },
  participant: {
    title: 'Participant Dashboard',
    description: 'Your team, submissions, and hackathon journey.',
    icon: TerminalSquare // Fallback
  }
};

export default function WorkspaceSelector() {
  const { availableRoles, switchActiveRole, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleSelectWorkspace = (role: NonNullable<UserRole>) => {
    switchActiveRole(role);
    // The WorkspaceResolver will automatically pick up the state change and route them
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 selection:bg-primary/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-[#0a0a0a] to-[#0a0a0a] opacity-60"></div>
      
      <div className="w-full max-w-4xl relative z-10 py-12">
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-bebas text-5xl tracking-widest text-white mb-2"
          >
            SELECT WORKSPACE
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-inter text-gray-400"
          >
            Authenticated as <span className="text-white font-medium">{user?.email}</span>
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableRoles.map((role, idx) => {
            const meta = roleMeta[role] || roleMeta['participant'];
            const Icon = meta.icon;
            
            return (
              <motion.button
                key={role}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                onClick={() => handleSelectWorkspace(role)}
                className="group relative bg-[#111111] border border-white/10 p-6 rounded-xl hover:border-primary/50 transition-all text-left overflow-hidden"
              >
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-lg bg-black/50 border border-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-primary/30 group-hover:text-primary transition-all">
                    <Icon className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                  </div>
                  
                  <h3 className="font-bebas text-2xl tracking-wider text-white mb-2">{meta.title}</h3>
                  <p className="font-inter text-sm text-gray-400 flex-1">{meta.description}</p>
                  
                  <div className="mt-6 flex items-center text-xs font-inter tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                    ENTER WORKSPACE →
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <button 
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all text-sm font-inter"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </motion.div>
      </div>
    </div>
  );
}
