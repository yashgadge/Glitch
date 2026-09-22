import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQS = [
  { 
    q: "WHO CAN PARTICIPATE?", 
    a: "Glitch 36 is open to all college students, developers, and tech enthusiasts. You can participate solo or in teams of up to 4 members." 
  },
  { 
    q: "WHAT IS THE THEME?", 
    a: "This year's theme focuses on AI, Web3, and Sustainability. However, we encourage open innovation across all tech domains. Surprise us!" 
  },
  { 
    q: "IS THERE A REGISTRATION FEE?", 
    a: "The registration fee is ₹800 per team, which includes 8 meals (2 for each of the 4 participants), high-speed Wi-Fi, and a dedicated workspace for the entire 36 hours." 
  },
  { 
    q: "DO I NEED TO KNOW CODING?", 
    a: "While technical skills are important for execution, we heavily value design, business logic, and presentation. A winning team needs a mix of developers, designers, and visionaries!" 
  }
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-6 md:px-12 w-full max-w-[900px] mx-auto relative z-10">
      <div className="flex flex-col items-center mb-16">
        <h2 className="font-bebas text-5xl md:text-7xl text-white mb-4 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          GOT <span className="text-primary drop-shadow-[0_0_20px_rgba(227,6,19,0.8)]">QUESTIONS?</span>
        </h2>
        <div className="w-32 h-1 bg-primary/50 shadow-[0_0_15px_rgba(227,6,19,1)]"></div>
      </div>

      <div className="flex flex-col gap-4">
        {FAQS.map((faq, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="hud-glass bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden cursor-pointer group"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <div className="p-6 flex justify-between items-center bg-white/5 group-hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <HelpCircle className="w-6 h-6 text-primary" />
                <h3 className="font-bebas text-2xl text-white tracking-widest">{faq.q}</h3>
              </div>
              <motion.div
                animate={{ rotate: openIndex === index ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="w-6 h-6 text-gray-400 group-hover:text-white" />
              </motion.div>
            </div>
            
            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-6 pt-0 border-t border-white/10 bg-black/20">
                    <p className="font-inter text-gray-300 mt-4 leading-relaxed font-medium">
                      {faq.a}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
