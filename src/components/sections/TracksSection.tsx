import { motion } from 'framer-motion';
import { Brain, Building2, HeartPulse, ShieldCheck, Rocket, Lightbulb } from 'lucide-react';

const tracks = [
  { icon: Brain, title: "AI & AUTOMATION", desc: "Build intelligent systems that automate and optimize the future." },
  { icon: Building2, title: "SMART CITIES", desc: "Innovate sustainable solutions for urban living and infrastructure." },
  { icon: HeartPulse, title: "HEALTH TECH", desc: "Revolutionize healthcare access, diagnostics, and patient care." },
  { icon: ShieldCheck, title: "FINTECH & CYBER", desc: "Secure the digital frontier and disrupt traditional finance." },
  { icon: Rocket, title: "SPACE & DEFENSE", desc: "Push the boundaries of aerospace engineering and global security." },
  { icon: Lightbulb, title: "OPEN INNOVATION", desc: "Got a wild idea that doesn't fit a box? Build it here." }
];

export default function TracksSection() {
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
        {tracks.map((track, idx) => (
          <motion.div 
            key={idx}
            variants={itemVariants}
            className="hud-glass bg-black/40 backdrop-blur-xl border border-white/5 hover:border-primary/50 transition-colors p-8 rounded-2xl flex flex-col items-start group"
          >
            <div className="p-4 bg-primary/10 rounded-xl mb-6 group-hover:bg-primary/20 transition-colors">
              <track.icon className="w-8 h-8 text-primary drop-shadow-[0_0_10px_rgba(227,6,19,0.8)]" />
            </div>
            <h3 className="font-bebas text-2xl text-white mb-3 tracking-widest">{track.title}</h3>
            <p className="font-inter text-gray-400 text-sm leading-relaxed">{track.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
