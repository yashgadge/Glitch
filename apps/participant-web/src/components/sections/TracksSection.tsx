import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Building2, HeartPulse, ShieldCheck, Rocket, Lightbulb, Target } from 'lucide-react';
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

export default function TracksSection() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'tracks'), where('active', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const data: Track[] = [];
      snap.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Track);
      });
      data.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setTracks(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tracks:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <section id="tracks" className="py-24 px-6 md:px-12 w-full max-w-[1400px] mx-auto relative z-10">
      <div className="flex flex-col items-center mb-16">
        <h2 className="font-bebas text-5xl md:text-7xl text-white mb-4 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          HACKATHON <span className="text-primary drop-shadow-[0_0_20px_rgba(227,6,19,0.8)]">TRACKS</span>
        </h2>
        <div className="w-32 h-1 bg-primary/50 shadow-[0_0_15px_rgba(227,6,19,1)]"></div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : tracks.length > 0 ? (
          tracks.map((track, idx) => {
            const IconComponent = iconMap[track.name.toUpperCase()] || Target;
            return (
              <motion.div 
                key={track.id || idx}
                variants={itemVariants}
                className="hud-glass bg-black/40 backdrop-blur-xl border border-white/5 hover:border-primary/50 transition-colors p-8 rounded-2xl flex flex-col items-start group"
              >
                <div className="p-4 bg-primary/10 rounded-xl mb-6 group-hover:bg-primary/20 transition-colors">
                  <IconComponent className="w-8 h-8 text-primary drop-shadow-[0_0_10px_rgba(227,6,19,0.8)]" />
                </div>
                <h3 className="font-bebas text-2xl text-white mb-3 tracking-widest uppercase">{track.name}</h3>
                <p className="font-inter text-gray-400 text-sm leading-relaxed">{track.description}</p>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full text-center text-gray-500 font-inter py-8">
            Tracks will be announced soon!
          </div>
        )}
      </motion.div>
    </section>
  );
}
