import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, MapPin, MessageCircle, Trophy, Users, 
  Rocket, Clock, ChevronRight, Brain, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { FaGithub, FaLinkedin, FaInstagram, FaDiscord } from 'react-icons/fa';

export default function MobileHero() {
  const [isLoaded, setIsLoaded] = useState(true);


  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
  };

  return (
    <div className="xl:hidden w-full max-w-md mx-auto pointer-events-auto flex flex-col pt-[140px] pb-12 px-4 gap-8">
      
      {/* 1. Header (Always Visible Immediately) */}
      <div className="flex flex-col items-center justify-center text-center w-full">
        <div className="mb-4 drop-shadow-[0_0_10px_rgba(227,6,19,0.8)]">
          <p className="font-inter text-[9px] tracking-[0.2em] text-gray-300 font-bold mb-1">
            SOMETIMES, ALL IT TAKES IS <span className="text-primary">36 HOURS</span>
          </p>
          <p className="font-inter text-[9px] tracking-[0.2em] text-gray-300 font-bold">
            TO CHANGE AN IDEA INTO A <span className="text-primary">REAL SOLUTION</span>
          </p>
        </div>
        
        <h1 className="font-rubik_glitch text-[15vw] leading-none text-white tracking-widest drop-shadow-[0_0_30px_rgba(227,6,19,0.5)] glitch-text">
          GLITCH
        </h1>
        
        <h2 
          className="font-anton text-[22vw] leading-none tracking-tighter select-none mt-[-10px]"
          style={{ 
            WebkitTextStroke: '2px #E30613', 
            color: 'transparent',
            filter: 'drop-shadow(0 0 15px rgba(227,6,19,0.8))'
          }}
        >
          36
        </h2>
        
        <div className="text-center mt-0 drop-shadow-[0_0_10px_rgba(227,6,19,0.8)]">
           <p className="font-inter text-[9px] tracking-[0.2em] text-gray-400 font-bold">&lt;CODE&gt;</p>
           <p className="font-inter text-[9px] tracking-[0.2em] text-white font-bold my-1">CONQUER</p>
           <p className="font-inter text-[9px] tracking-[0.2em] text-gray-400 font-bold">&lt;/CODE&gt;</p>
        </div>
      </div>

      {!isLoaded ? (
        /* Skeleton Cards */
        <div className="flex flex-col gap-4 w-full h-[100dvh]">
          <div className="flex gap-3 w-full">
            <div className="liquid-glass rounded-full w-full h-16 animate-pulse bg-white/10 flex-1"></div>
            <div className="liquid-glass rounded-full w-full h-16 animate-pulse bg-white/10 flex-1"></div>
          </div>
          <div className="liquid-glass rounded-[2rem] p-5 w-full h-20 animate-pulse bg-white/10 mt-2"></div>
          <div className="liquid-glass rounded-[2rem] p-5 w-full h-24 animate-pulse bg-white/10"></div>
          <div className="liquid-glass rounded-[2.5rem] p-8 w-full h-40 animate-pulse bg-white/10"></div>
        </div>
      ) : (
        /* 2. Data Cards Flow (Slowly Fades In) */
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-4 w-full"
        >
        
        {/* Primary CTAs */}
        <div className="flex gap-3 w-full">
          <motion.div variants={itemVariants} className="flex-1 flex">
            <Link 
              to="/login" 
              className="w-full bg-primary hover:bg-primary/90 rounded-full p-4 flex justify-center items-center group relative overflow-hidden shadow-[0_0_20px_rgba(227,6,19,0.6)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="flex items-center gap-2 relative z-10">
                <Zap className="w-5 h-5 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                <span className="font-bebas text-2xl tracking-widest text-white mt-1">LOGIN</span>
              </div>
            </Link>
          </motion.div>

          <motion.a 
            variants={itemVariants} 
            href="https://chat.whatsapp.com/H2HAmR4ZmS49UEGBW1J0iP" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="liquid-glass rounded-full p-4 flex-1 flex justify-center items-center group hover:bg-white/10 relative overflow-hidden"
          >
            <div className="flex items-center gap-2 relative z-10">
              <MessageCircle className="w-5 h-5 text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
              <span className="font-bebas text-2xl tracking-widest text-white mt-1">WHATSAPP</span>
            </div>
          </motion.a>
        </div>

        {/* Date Card */}
        <motion.div variants={itemVariants} className="liquid-glass rounded-[2rem] p-5 flex justify-between items-center w-full mt-2">
          <div className="flex-1 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-white/80" />
            <div className="flex flex-col">
              <span className="font-inter text-[10px] tracking-widest text-white font-bold">OCTOBER 10-11,</span>
              <span className="font-inter text-[10px] tracking-widest text-white/80 font-medium">2026</span>
            </div>
          </div>
          <div className="w-[1px] h-8 bg-white/20 mx-4"></div>
          <div className="flex-1 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-white/80" />
            <div className="flex flex-col">
              <span className="font-inter text-[10px] tracking-widest text-white font-bold">JSPM'S WAGHOLI,</span>
              <span className="font-inter text-[10px] tracking-widest text-white/80 font-medium">PUNE</span>
            </div>
          </div>
        </motion.div>

        {/* Prize Card */}
        <motion.div variants={itemVariants} className="liquid-glass rounded-[2.5rem] p-8 flex flex-col items-center justify-center w-full">
          <Trophy className="w-8 h-8 text-white mb-3 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
          <span className="font-inter text-[10px] tracking-widest text-white font-bold mb-1">WIN EXCITING</span>
          <span className="font-inter text-[10px] tracking-widest text-white font-bold mb-2">CASH PRIZES WORTH</span>
          <span className="font-bebas text-5xl text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            <span className="text-2xl mr-1">₹</span>40,000+
          </span>
        </motion.div>

        {/* Stats Card */}
        <motion.div variants={itemVariants} className="liquid-glass rounded-[2rem] p-5 flex justify-between items-center w-full">
          <div className="flex-1 flex flex-col items-center justify-center gap-1">
            <Clock className="w-4 h-4 text-white/80 mb-1" />
            <span className="font-bebas text-3xl text-white leading-none tracking-wider drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">36</span>
            <span className="font-inter text-[8px] tracking-[0.2em] text-white/80 font-bold">HOURS</span>
          </div>
          <div className="w-[1px] h-12 bg-white/20 mx-2"></div>
          <div className="flex-1 flex flex-col items-center justify-center gap-1">
            <Users className="w-4 h-4 text-white/80 mb-1" />
            <span className="font-bebas text-3xl text-white leading-none tracking-wider drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">200</span>
            <span className="font-inter text-[8px] tracking-[0.2em] text-white/80 font-bold">TEAMS</span>
          </div>
          <div className="w-[1px] h-12 bg-white/20 mx-2"></div>
          <div className="flex-1 flex flex-col items-center justify-center gap-1">
            <Rocket className="w-4 h-4 text-white/80 mb-1" />
            <span className="font-bebas text-3xl text-white leading-none tracking-wider drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">800+</span>
            <span className="font-inter text-[8px] tracking-[0.2em] text-white/80 font-bold">INNOVATORS</span>
          </div>
        </motion.div>

        {/* Secondary Links */}
        <div className="flex flex-col gap-4 w-full mt-2">
          
          <motion.div variants={itemVariants} className="liquid-glass rounded-full p-4 px-6 flex justify-between items-center w-full cursor-pointer group hover:bg-white/10">
            <div className="flex items-center gap-4">
              <Users className="w-5 h-5 text-white/90" />
              <div className="flex flex-col">
                <span className="font-inter text-[11px] tracking-widest text-white font-bold">COLLABORATE</span>
                <span className="font-inter text-[9px] tracking-widest text-white/50">INNOVATE</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors group-hover:translate-x-1" />
          </motion.div>
          
          <motion.div variants={itemVariants} className="liquid-glass rounded-full p-4 px-6 flex justify-between items-center w-full cursor-pointer group hover:bg-white/10">
            <div className="flex items-center gap-4">
              <Brain className="w-5 h-5 text-white/90" />
              <div className="flex flex-col">
                <span className="font-inter text-[11px] tracking-widest text-white font-bold">AI AND AUTOMATION</span>
                <span className="font-inter text-[9px] tracking-widest text-white/50">THE FUTURE IS SMART</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors group-hover:translate-x-1" />
          </motion.div>
        </div>
        
        {/* Footer */}
        <motion.div variants={itemVariants} className="mt-8 flex flex-col items-center justify-center w-full gap-4">
         <div className="flex flex-col items-center">
            <span className="font-inter text-[8px] tracking-[0.3em] text-gray-500 font-bold mb-1">POWERED BY</span>
            <span className="font-inter text-[12px] tracking-[0.2em] text-white font-bold">DEVNOVATE.CO</span>
         </div>
         <div className="flex items-center gap-6">
            <a href="#" className="text-gray-400 hover:text-white transition-colors"><FaGithub className="w-4 h-4" /></a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors"><FaDiscord className="w-4 h-4" /></a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors"><FaLinkedin className="w-4 h-4" /></a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors"><FaInstagram className="w-4 h-4" /></a>
         </div>
         <div className="w-32 h-[3px] bg-white rounded-full mt-4 mb-2 opacity-50"></div>
        </motion.div>
        </motion.div>
      )}
    </div>
  );
}
