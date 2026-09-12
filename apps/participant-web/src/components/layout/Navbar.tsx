import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState('HOME');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (location.pathname !== '/') return;
      
      setScrolled(window.scrollY > 50);

      // ScrollSpy logic to dynamically update active tab
      const sections = ['HOME', 'TRACKS', 'PRIZES', 'SCHEDULE', 'ABOUT', 'FAQ', 'CONTACT'];
      let current = 'HOME';

      // If at the very top, it's always HOME
      if (window.scrollY < 100) {
        current = 'HOME';
      } else {
        for (const section of sections) {
          if (section === 'HOME') continue;
          const element = document.getElementById(section.toLowerCase());
          if (element) {
            const rect = element.getBoundingClientRect();
            // If the section is in the top 300px of the viewport, it's active
            if (rect.top <= 300) {
              current = section;
            }
          }
        }
      }

      setActiveTab(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  return (
    <>
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full z-[100] transition-all duration-500 relative ${
          scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-4 md:py-6'
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex items-center justify-between w-full">
        {/* Logo */}
        <div className="flex items-center gap-1 cursor-pointer">
          <span className="font-bebas text-3xl md:text-4xl text-white tracking-wider drop-shadow-md">GLITCH</span>
          <span className="font-bebas text-lg md:text-xl text-primary mt-1 drop-shadow-md">36</span>
        </div>

        {/* Desktop Nav in HUD Pill */}
        <div className="hidden md:flex items-center gap-1 absolute left-0 right-0 mx-auto w-max bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-50">
          {['HOME', 'TRACKS', 'PRIZES', 'SCHEDULE', 'ABOUT', 'FAQ', 'CONTACT'].map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase()}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab(item);
                
                if (location.pathname !== '/') {
                   navigate(item === 'HOME' ? '/' : `/#${item.toLowerCase()}`);
                   return;
                }
                
                if (item === 'HOME') {
                  if ((window as any).lenis) (window as any).lenis.scrollTo(0, { offset: 0 });
                  else window.scrollTo({ top: 0, behavior: 'smooth' });
                  return;
                }

                const target = document.getElementById(item.toLowerCase());
                if (target) {
                  if ((window as any).lenis) {
                    (window as any).lenis.scrollTo(target, { offset: -80 });
                  } else {
                    window.scrollTo({
                      top: target.offsetTop - 80,
                      behavior: 'smooth'
                    });
                  }
                }
              }}
              className="relative px-5 py-2.5 rounded-full group outline-none"
            >
              {activeTab === item && (
                <motion.div
                  layoutId="liquid-lens"
                  className="absolute inset-0 rounded-full overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.0) 20%, rgba(255,255,255,0.0) 80%, rgba(255,255,255,0.05) 100%)',
                    backdropFilter: 'blur(3px) contrast(120%) saturate(130%) brightness(1.1)',
                    WebkitBackdropFilter: 'blur(3px) contrast(120%) saturate(130%) brightness(1.1)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.2), inset 0 6px 12px rgba(255,255,255,0.4), inset 0 -4px 8px rgba(0,0,0,0.2)'
                  }}
                  transition={{ type: "spring", stiffness: 45, damping: 14, mass: 1.2 }}
                >
                  {/* Top Specular Highlight (Crisp curved reflection) */}
                  <div className="absolute top-[2%] left-[10%] w-[80%] h-[35%] bg-gradient-to-b from-white/95 to-transparent rounded-full blur-[0.5px] -rotate-[5deg] pointer-events-none" />
                  
                  {/* Bottom Specular Highlight (Sharp edge reflection) */}
                  <div className="absolute bottom-[2%] left-[10%] w-[80%] h-[15%] bg-gradient-to-t from-white/60 to-transparent rounded-full blur-[1px] pointer-events-none" />
                </motion.div>
              )}
              <span 
                className={`relative z-10 font-inter text-[11px] font-bold transition-all duration-300 flex items-center justify-center h-full w-full ${
                  activeTab === item 
                    ? 'text-white tracking-[0.25em] scale-[1.15] drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)]' 
                    : 'text-gray-300 tracking-[0.2em] group-hover:text-white'
                }`}
              >
                {item}
              </span>
            </a>
          ))}
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-6 z-50">
          <Link to="/login" className="font-bebas text-xl tracking-widest bg-primary hover:bg-white text-white hover:text-primary px-8 py-2 rounded-full shadow-[0_0_15px_rgba(227,6,19,0.5)] hover:shadow-[0_0_20px_rgba(255,255,255,0.8)] transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
            <Zap size={18} /> SIGN IN
          </Link>
        </div>

        </div>
      </motion.nav>

      {/* Mobile Bottom Nav (Flex Wrap 2-row layout) */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="md:hidden fixed bottom-[env(safe-area-inset-bottom,1rem)] left-4 right-4 mx-auto w-auto max-w-[420px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-[100] overflow-hidden"
      >
        <div className="flex flex-wrap justify-center items-center gap-1 p-2 w-full">
          {['HOME', 'TRACKS', 'PRIZES', 'SCHEDULE', 'ABOUT', 'FAQ', 'CONTACT'].map((item) => (
          <a 
            key={item} 
            href={`#${item.toLowerCase()}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab(item);
              
              if (location.pathname !== '/') {
                 navigate(item === 'HOME' ? '/' : `/#${item.toLowerCase()}`);
                 return;
              }
              
              if (item === 'HOME') {
                if ((window as any).lenis) (window as any).lenis.scrollTo(0, { offset: 0 });
                else window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }

              const target = document.getElementById(item.toLowerCase());
              if (target) {
                if ((window as any).lenis) {
                  (window as any).lenis.scrollTo(target, { offset: -80 });
                } else {
                  window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                  });
                }
              }
            }}
            className="flex-1 min-w-[22%] relative px-2 py-3 rounded-xl group outline-none flex justify-center items-center"
          >
            {activeTab === item && (
              <motion.div
                layoutId="liquid-lens-mobile"
                className="absolute inset-0 rounded-xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.0) 20%, rgba(255,255,255,0.0) 80%, rgba(255,255,255,0.05) 100%)',
                  backdropFilter: 'blur(3px) contrast(120%) saturate(130%) brightness(1.1)',
                  WebkitBackdropFilter: 'blur(3px) contrast(120%) saturate(130%) brightness(1.1)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.2), inset 0 6px 12px rgba(255,255,255,0.4), inset 0 -4px 8px rgba(0,0,0,0.2)'
                }}
                transition={{ type: "spring", stiffness: 45, damping: 14, mass: 1.2 }}
              >
                {/* Top Specular Highlight */}
                <div className="absolute top-[2%] left-[10%] w-[80%] h-[35%] bg-gradient-to-b from-white/95 to-transparent rounded-xl blur-[0.5px] -rotate-[5deg] pointer-events-none" />
                {/* Bottom Specular Highlight */}
                <div className="absolute bottom-[2%] left-[10%] w-[80%] h-[15%] bg-gradient-to-t from-white/60 to-transparent rounded-xl blur-[1px] pointer-events-none" />
              </motion.div>
            )}
            <span 
              className={`relative z-10 font-inter text-[10px] sm:text-[11px] font-bold transition-all duration-300 flex items-center justify-center h-full w-full ${
                activeTab === item 
                  ? 'text-white tracking-[0.15em] scale-[1.15] drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)]' 
                  : 'text-gray-300 tracking-[0.05em] group-hover:text-white'
              }`}
            >
              {item}
            </span>
          </a>
        ))}
        </div>
      </motion.div>


    </>
  );
}

