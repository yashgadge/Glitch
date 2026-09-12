import { motion } from 'framer-motion';
import { Mail, MapPin, Phone, Send, Zap } from 'lucide-react';

export default function ContactSection() {
  return (
    <section id="contact" className="py-24 px-6 md:px-12 w-full max-w-[1200px] mx-auto relative z-10">
      <div className="flex flex-col items-center mb-16">
        <h2 className="font-bebas text-5xl md:text-7xl text-white mb-4 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          GET IN <span className="text-primary drop-shadow-[0_0_20px_rgba(227,6,19,0.8)]">TOUCH</span>
        </h2>
        <div className="w-32 h-1 bg-primary/50 shadow-[0_0_15px_rgba(227,6,19,1)]"></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
        
        {/* Contact Info */}
        <div className="flex-1 flex flex-col gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="hud-glass bg-black/40 backdrop-blur-xl border border-white/10 p-8 flex items-start gap-6"
          >
            <div className="p-4 bg-primary/20 rounded-full border border-primary/50">
              <MapPin className="w-8 h-8 text-primary drop-shadow-[0_0_10px_rgba(227,6,19,0.8)]" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-bebas text-2xl text-white tracking-widest mb-1">LOCATION</h3>
              <p className="font-inter text-sm text-gray-300 font-medium">JSPM'S WAGHOLI CAMPUS</p>
              <p className="font-inter text-sm text-gray-400">PUNE, MAHARASHTRA 412207</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="hud-glass bg-black/40 backdrop-blur-xl border border-white/10 p-8 flex items-start gap-6"
          >
            <div className="p-4 bg-primary/20 rounded-full border border-primary/50">
              <Mail className="w-8 h-8 text-primary drop-shadow-[0_0_10px_rgba(227,6,19,0.8)]" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-bebas text-2xl text-white tracking-widest mb-1">EMAIL US</h3>
              <p className="font-inter text-sm text-gray-300 font-medium">YASHGADGE33@GMAIL.COM</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="hud-glass bg-black/40 backdrop-blur-xl border border-white/10 p-8 flex items-start gap-6"
          >
            <div className="p-4 bg-primary/20 rounded-full border border-primary/50">
              <Phone className="w-8 h-8 text-primary drop-shadow-[0_0_10px_rgba(227,6,19,0.8)]" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-bebas text-2xl text-white tracking-widest mb-1">CALL US</h3>
              <p className="font-inter text-sm text-gray-300 font-medium">+91 74101 53938</p>
            </div>
          </motion.div>
        </div>

        {/* Decorative Element */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex-1 hud-glass bg-black/40 backdrop-blur-2xl border border-white/10 p-8 md:p-12 relative overflow-hidden flex items-center justify-center min-h-[400px]"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 blur-[80px] rounded-full"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <h3 className="font-rubik_glitch text-6xl md:text-8xl text-white tracking-widest drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] mb-4 glitch-text">
              GLITCH
            </h3>
            <div className="font-anton text-7xl md:text-9xl tracking-tighter select-none" style={{ WebkitTextStroke: '2px #E30613', color: 'transparent' }}>
              36
            </div>
            
            <div className="mt-8 flex gap-4 items-center">
               <div className="w-16 h-1 bg-primary/50 shadow-[0_0_10px_rgba(227,6,19,0.8)]"></div>
               <div className="w-4 h-1 bg-white/50"></div>
               <div className="w-2 h-1 bg-white/50"></div>
            </div>
            
            <div className="mt-8">
               <p className="font-inter text-[11px] tracking-[0.3em] text-gray-400 font-bold">&lt;CODE&gt; CONQUER &lt;/CODE&gt;</p>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
