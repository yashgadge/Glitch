import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, Building2, HeartPulse, ShieldCheck, Rocket, Lightbulb, 
  Clock, ArrowRight, Target 
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@shared/lib/firebase';
import type { Track } from '@shared/types/models';

const iconMap: Record<string, any> = {
  'AI & AUTOMATION': Brain,
  'SMART CITIES': Building2,
  'HEALTH TECH': HeartPulse,
  'FINTECH & CYBER': ShieldCheck,
  'SPACE & DEFENSE': Rocket,
  'OPEN INNOVATION': Lightbulb,
};

export default function BottomTracks() {
  const [tracks, setTracks] = useState<Track[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'tracks'), where('active', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const data: Track[] = [];
      snap.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Track);
      });
      data.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setTracks(data);
    });
    return () => unsub();
  }, []);

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 1.5 }}
      className="w-full z-30 pb-2 flex flex-col gap-3 pointer-events-auto"
    >
      {/* Tracks Heading (Hidden on mobile) */}
      <div className="hidden md:flex justify-center items-center w-full relative">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent absolute"></div>
        <div className="bg-[#050505] px-6 py-1.5 border border-primary/40 text-primary font-inter text-[10px] tracking-[0.3em] relative z-10 font-medium drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          TRACKS
        </div>
      </div>

      {/* Tracks Grid (Hidden on Mobile to reduce clutter) */}
      <div className="hidden md:flex flex-wrap justify-center items-center gap-3 mt-2">
        {tracks.map((track, index) => {
          const IconComponent = iconMap[track.name.toUpperCase()] || Target;
          return (
            <motion.div
              key={track.id || index}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              className="hud-pill flex items-center gap-2 cursor-pointer group border-primary/20 hover:border-primary px-3 py-1.5"
            >
              <div className="text-primary/70 group-hover:text-primary transition-colors">
                <IconComponent className="w-5 h-5" />
              </div>
              <p className="font-inter text-[10px] tracking-[0.2em] text-gray-300 font-bold group-hover:text-white transition-colors uppercase whitespace-pre-line">
                {track.shortName || track.name}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Footer Area */}
      <div className="flex flex-col md:flex-row justify-between items-center max-w-[1400px] mx-auto w-full border-t border-white/10 pt-3 mt-1">
        <div className="flex flex-col md:flex-row items-center text-center md:text-left gap-2 md:gap-4 mb-4 md:mb-0">
          <Clock className="text-primary w-6 h-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
          <div className="font-inter text-[12px] tracking-widest font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            <p className="text-white">THE CLOCK IS TICKING.</p>
            <p className="text-primary mt-1">ARE YOU READY TO GLITCH?</p>
          </div>
        </div>

        <div className="hidden md:flex font-inter text-[12px] tracking-[0.3em] text-white font-bold mt-4 md:mt-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <span className="hover:text-primary transition-colors cursor-pointer">BUILD</span>
          <span className="mx-4 text-primary">{'>'}</span>
          <span className="hover:text-primary transition-colors cursor-pointer">INNOVATE</span>
          <span className="mx-4 text-primary">{'>'}</span>
          <span className="hover:text-primary transition-colors cursor-pointer">IMPACT</span>
        </div>
      </div>
    </motion.div>
  );
}
