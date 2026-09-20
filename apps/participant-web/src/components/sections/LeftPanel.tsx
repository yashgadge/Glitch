import { motion } from 'framer-motion';
import { MapPin, Users, Calendar, MessageCircle } from 'lucide-react';

export default function LeftPanel() {
  const containerVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.8, delay: 1.2, staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="hidden xl:flex flex-col gap-4 z-20 pointer-events-auto w-[280px]"
    >
      {/* Date */}
      <motion.div variants={itemVariants} className="hud-glass p-4 px-6 flex flex-1 min-w-[220px] items-start gap-4">
        <Calendar className="w-5 h-5 text-primary shrink-0 mt-1 drop-shadow-md" />
        <div>
          <p className="font-inter text-[11px] tracking-[0.2em] text-white font-bold drop-shadow-md">OCTOBER 24-25,</p>
          <p className="font-inter text-[11px] tracking-[0.2em] text-white font-bold drop-shadow-md">2026</p>
        </div>
      </motion.div>

      {/* Location */}
      <motion.div variants={itemVariants} className="hud-glass p-4 px-6 flex flex-1 min-w-[220px] items-start gap-4">
        <MapPin className="w-5 h-5 text-primary shrink-0 mt-1 drop-shadow-md" />
        <div>
          <p className="font-inter text-[11px] tracking-[0.2em] text-white font-bold drop-shadow-md">JSPM'S</p>
          <p className="font-inter text-[11px] tracking-[0.2em] text-white font-bold drop-shadow-md">WAGHOLI, PUNE</p>
        </div>
      </motion.div>

      {/* WhatsApp Link */}
      <motion.a 
        href="https://chat.whatsapp.com/H2HAmR4ZmS49UEGBW1J0iP"
        target="_blank"
        rel="noopener noreferrer"
        variants={itemVariants} 
        className="hud-glass p-4 px-6 flex flex-1 min-w-[220px] items-start gap-4 cursor-pointer hover:border-green-500/50 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all group"
      >
        <MessageCircle className="w-5 h-5 text-green-500 shrink-0 mt-1 drop-shadow-md group-hover:scale-110 transition-transform" />
        <div>
          <p className="font-inter text-[11px] tracking-[0.2em] text-white font-bold drop-shadow-md group-hover:text-green-400 transition-colors">JOIN WHATSAPP</p>
          <p className="font-inter text-[10px] tracking-[0.2em] text-gray-400 font-bold drop-shadow-md mt-0.5">COMMUNITY GROUP</p>
        </div>
      </motion.a>

      {/* Collaborate */}
      <motion.div variants={itemVariants} className="hud-glass p-4 px-6 flex flex-1 min-w-[220px] items-start gap-4">
        <Users className="w-5 h-5 text-primary shrink-0 mt-1 drop-shadow-md" />
        <div>
          <p className="font-inter text-[11px] tracking-[0.2em] text-white font-bold drop-shadow-md">COLLABORATE</p>
          <p className="font-inter text-[11px] tracking-[0.2em] text-white font-bold drop-shadow-md">INNOVATE</p>
        </div>
      </motion.div>

      {/* Stats Block */}
      <motion.div variants={itemVariants} className="hud-glass p-6 flex flex-col sm:flex-row xl:flex-col gap-6 w-full xl:w-auto justify-between">
        <div>
          <p className="font-bebas text-5xl text-primary leading-none tracking-wider drop-shadow-md">36</p>
          <p className="font-inter text-[11px] tracking-[0.2em] text-white font-bold mt-1 drop-shadow-md">HOURS</p>
        </div>
        <div className="h-px sm:w-px sm:h-auto xl:h-px xl:w-full bg-primary/20" />
        <div>
          <p className="font-bebas text-4xl text-primary leading-none tracking-wider drop-shadow-md">200</p>
          <p className="font-inter text-[11px] tracking-[0.2em] text-white font-bold mt-1 drop-shadow-md">TEAMS</p>
        </div>
        <div className="h-px w-full bg-primary/20" />
        <div>
          <p className="font-bebas text-4xl text-primary leading-none tracking-wider drop-shadow-md">800+</p>
          <p className="font-inter text-[11px] tracking-[0.2em] text-white font-bold mt-1 drop-shadow-md">INNOVATORS</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
