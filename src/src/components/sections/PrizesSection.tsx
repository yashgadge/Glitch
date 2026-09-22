import { motion } from 'framer-motion';
import { Trophy, Medal, Star } from 'lucide-react';

export default function PrizesSection() {
  return (
    <section id="prizes" className="py-24 px-6 md:px-12 w-full max-w-[1400px] mx-auto relative z-10">
      <div className="flex flex-col items-center mb-16">
        <h2 className="font-bebas text-5xl md:text-7xl text-white mb-4 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          THE <span className="text-primary drop-shadow-[0_0_20px_rgba(227,6,19,0.8)]">SPOILS</span>
        </h2>
        <div className="w-32 h-1 bg-primary/50 shadow-[0_0_15px_rgba(227,6,19,1)]"></div>
      </div>

      <div className="flex flex-col lg:flex-row justify-center items-center gap-8 lg:gap-12">
        {/* Runner Up */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hud-glass bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl flex flex-col items-center w-full max-w-sm lg:mt-16 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gray-400/50" />
          <Medal className="w-12 h-12 text-gray-400 mb-4 drop-shadow-[0_0_10px_rgba(156,163,175,0.8)]" />
          <h3 className="font-bebas text-3xl text-gray-300 tracking-widest mb-2">RUNNER UP</h3>
          <p className="font-bebas text-4xl text-white tracking-wider">₹12,000</p>
          <div className="mt-4 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
            <span className="font-inter text-[10px] text-gray-300 tracking-widest font-bold">+ GOODIES & CERTIFICATES</span>
          </div>
        </motion.div>

        {/* Winner */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="hud-glass bg-black/60 backdrop-blur-2xl border border-primary/50 p-12 rounded-2xl flex flex-col items-center w-full max-w-md relative overflow-hidden shadow-[0_0_50px_rgba(227,6,19,0.15)]"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_20px_rgba(227,6,19,1)]" />
          <Trophy className="w-16 h-16 text-primary mb-6 drop-shadow-[0_0_20px_rgba(227,6,19,0.8)]" />
          <h3 className="font-bebas text-4xl text-white tracking-widest mb-2">GRAND CHAMPION</h3>
          <p className="font-bebas text-6xl text-primary tracking-wider drop-shadow-[0_0_15px_rgba(227,6,19,0.5)]">₹20,000</p>
          <div className="mt-6 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <span className="font-inter text-xs text-primary tracking-widest font-bold">+ GOODIES & CERTIFICATES</span>
          </div>
        </motion.div>

        {/* 2nd Runner Up */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="hud-glass bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl flex flex-col items-center w-full max-w-sm lg:mt-16 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-700/50" />
          <Star className="w-12 h-12 text-amber-600 mb-4 drop-shadow-[0_0_10px_rgba(217,119,6,0.8)]" />
          <h3 className="font-bebas text-3xl text-amber-600/80 tracking-widest mb-2">3RD PLACE</h3>
          <p className="font-bebas text-4xl text-white tracking-wider">₹8,000</p>
          <div className="mt-4 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
            <span className="font-inter text-[10px] text-amber-600/80 tracking-widest font-bold">+ GOODIES & CERTIFICATES</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
