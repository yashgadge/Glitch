import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function LoadingScreen({ message = "INITIALIZING SYSTEM..." }: { message?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Prevent flashing for very quick loads
    const timer = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Background Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] bg-primary/20 blur-[100px] rounded-full opacity-60 pointer-events-none" />
          
          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo Text */}
            <h1 className="font-bebas text-5xl md:text-7xl tracking-widest text-white mb-2 flex items-center gap-2 md:gap-4">
              PANDORA <span className="font-inter font-light text-2xl md:text-4xl text-gray-400">X</span> GLITCH <span className="text-primary">36</span>
            </h1>
            
            {/* Minimalist Progress Line */}
            <div className="w-48 h-[2px] bg-white/10 rounded-full overflow-hidden mb-6 relative">
              <motion.div 
                className="absolute top-0 bottom-0 left-0 bg-primary w-1/3"
                animate={{
                  x: ["-100%", "300%"]
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  ease: "easeInOut"
                }}
              />
            </div>
            
            {/* Message */}
            <p className="font-mono text-[10px] text-primary/70 uppercase tracking-[0.3em] animate-pulse">
              {message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
