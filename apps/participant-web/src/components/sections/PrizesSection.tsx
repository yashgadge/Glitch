import { motion } from 'framer-motion';
import { Trophy, Medal, Star } from 'lucide-react';

export default function PrizesSection() {
  return (
    <section id="prizes" className="py-24 px-6 md:px-12 w-full max-w-[1400px] mx-auto relative z-10">
      <div className="flex flex-col items-center mb-16 text-center">
        <h2 className="font-bebas text-5xl md:text-7xl text-white mb-4 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          THE <span className="text-primary drop-shadow-[0_0_20px_rgba(227,6,19,0.8)]">SPOILS</span>
        </h2>
        <div className="w-32 h-1 bg-primary/50 shadow-[0_0_15px_rgba(227,6,19,1)] mb-6"></div>
        <p className="font-inter text-sm text-gray-400 max-w-2xl italic">
          * Prizes and awards are determined strictly through the hackathon's published judging and competition rules. 
          Registration does not guarantee any prize.
        </p>
      </div>

      <div className="flex justify-center items-center">
        {/* Overall Prize Pool */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="hud-glass bg-black/60 backdrop-blur-2xl border border-primary/50 p-12 md:p-16 rounded-2xl flex flex-col items-center w-full max-w-2xl relative overflow-hidden shadow-[0_0_50px_rgba(227,6,19,0.15)]"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_20px_rgba(227,6,19,1)]" />
          <Trophy className="w-20 h-20 text-primary mb-6 drop-shadow-[0_0_20px_rgba(227,6,19,0.8)]" />
          <h3 className="font-bebas text-4xl md:text-5xl text-white tracking-widest mb-2">OVERALL PRIZE POOL</h3>
          <p className="font-bebas text-6xl md:text-8xl text-primary tracking-wider drop-shadow-[0_0_15px_rgba(227,6,19,0.5)] mb-4">₹40,000+</p>
          
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <div className="px-5 py-2.5 bg-primary/10 border border-primary/20 rounded-full">
              <span className="font-inter text-sm text-primary tracking-widest font-bold uppercase">+ Goodies & Certificates</span>
            </div>
            <div className="px-5 py-2.5 bg-white/10 border border-white/20 rounded-full">
              <span className="font-inter text-sm text-white tracking-widest font-bold uppercase">+ Get Credits</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
