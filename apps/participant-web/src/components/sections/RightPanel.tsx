import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { FaDiscord, FaGithub, FaLinkedin, FaInstagram } from 'react-icons/fa';

export default function RightPanel() {
  const containerVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8, delay: 1.2, staggerChildren: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="hidden xl:flex flex-col gap-6 z-20 pointer-events-auto w-[320px] items-center -mt-8"
    >
      {/* Registration Deadline */}
      <motion.div variants={itemVariants} className="w-full relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-transparent rounded-lg blur opacity-50 group-hover:opacity-100 transition-opacity"></div>
        <div className="hud-glass w-full p-4 border border-yellow-500/50 rounded-lg relative bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center gap-1">
          <p className="font-inter text-[10px] tracking-[0.2em] text-yellow-500 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
            REGISTRATION DEADLINE
          </p>
          <p className="font-bebas text-2xl text-white tracking-wider">
            26 SEPT, 12:00 AM
          </p>
        </div>
      </motion.div>

      {/* Prize Box */}
      <motion.div 
        variants={itemVariants}
        className="hud-glass w-full p-8 flex flex-col items-center justify-center relative overflow-hidden group border-primary shadow-[0_0_30px_rgba(227,6,19,0.3)] rounded-xl"
      >
        <Trophy className="w-16 h-16 text-yellow-500 mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] relative z-10 transition-transform duration-300 group-hover:scale-110" />
        
        <div className="text-center relative z-10 mb-4">
          <p className="font-bebas text-2xl text-yellow-500 tracking-wider mb-1">OCTOBER 24-25, 2026</p>
          <p className="font-inter text-[10px] tracking-[0.2em] text-white font-bold drop-shadow-md">OFFLINE HACKATHON</p>
        </div>

        <div className="text-center relative z-10">
          <p className="font-inter text-[11px] tracking-[0.2em] text-white font-bold drop-shadow-md mb-2">WIN EXCITING</p>
          <p className="font-inter text-[11px] tracking-[0.2em] text-white font-bold drop-shadow-md mb-4">CASH PRIZES WORTH</p>
          <p className="font-bebas text-5xl text-white tracking-wider drop-shadow-md">
            <span className="text-4xl mr-1">₹</span>40,000+
          </p>
        </div>
      </motion.div>

      {/* Registration Fee */}
      <motion.div variants={itemVariants} className="w-full">
        <div className="hud-glass w-full p-4 border border-[#3b82f6]/40 rounded-lg bg-black/60 backdrop-blur-xl flex items-center justify-center gap-3 cursor-pointer hover:border-[#3b82f6]/80 transition-colors">
          <svg className="w-5 h-5 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <p className="font-bebas text-xl text-[#3b82f6] tracking-wider pt-1">
            REGISTRATION FEE: ₹599
          </p>
        </div>
      </motion.div>

      {/* Powered By Section (Detached) */}
      <motion.div variants={itemVariants} className="flex flex-col items-center gap-3 mt-4">
        <p className="font-inter text-[10px] tracking-[0.2em] text-gray-400 font-bold drop-shadow-md">
          POWERED BY
        </p>
        <p className="font-inter text-sm tracking-[0.2em] text-white font-bold drop-shadow-md hover:text-primary transition-colors cursor-pointer">
          DEVNOVATE.CO
        </p>
        <div className="flex items-center gap-5 mt-2">
          <FaGithub className="w-5 h-5 text-white hover:text-primary cursor-pointer transition-colors drop-shadow-md" />
          <FaDiscord className="w-5 h-5 text-white hover:text-primary cursor-pointer transition-colors drop-shadow-md" />
          <FaLinkedin className="w-5 h-5 text-white hover:text-primary cursor-pointer transition-colors drop-shadow-md" />
          <FaInstagram className="w-5 h-5 text-white hover:text-primary cursor-pointer transition-colors drop-shadow-md" />
        </div>
      </motion.div>
    </motion.div>
  );
}
