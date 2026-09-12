import { motion } from 'framer-motion';
import { 
  Brain, Building2, HeartPulse, ShieldCheck, Rocket, Lightbulb, 
  Clock, ArrowRight 
} from 'lucide-react';

const tracks = [
  { icon: Brain, label: "AI AND\nAUTOMATION" },
  { icon: Building2, label: "SMART CITIES\nAND SUSTAINABILITY" },
  { icon: HeartPulse, label: "HEALTH" },
  { icon: ShieldCheck, label: "FINTECH AND\nCYBERSECURITY" },
  { icon: Rocket, label: "SPACE AND\nDEFENSE" },
  { icon: Lightbulb, label: "OPEN\nINNOVATION" }
];

export default function BottomTracks() {
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
        {tracks.map((track, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            className="hud-pill flex items-center gap-2 cursor-pointer group border-primary/20 hover:border-primary px-3 py-1.5"
          >
            <div className="text-primary/70 group-hover:text-primary transition-colors">
              <track.icon className="w-5 h-5" />
            </div>
            <p className="font-inter text-[10px] tracking-[0.2em] text-gray-300 font-bold group-hover:text-white transition-colors">
              {track.label}
            </p>
          </motion.div>
        ))}
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

        <button className="hud-pill flex items-center justify-center gap-3 w-full md:w-auto px-8 py-2 border-primary bg-primary/20 hover:bg-primary/40 shadow-[0_0_30px_rgba(227,6,19,0.5)] group relative overflow-hidden text-md">
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
           <span className="font-bebas tracking-widest text-white relative z-10 group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">REGISTER NOW</span>
           <ArrowRight className="w-5 h-5 text-white relative z-10 transition-transform group-hover:translate-x-1" />
        </button>

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
