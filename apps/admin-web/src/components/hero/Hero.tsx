import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import LeftPanel from '../sections/LeftPanel';
import RightPanel from '../sections/RightPanel';
import BottomTracks from '../sections/BottomTracks';
import CustomCursor from '../ui/CustomCursor';
import MobileHero from './MobileHero';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const [isDesktop, setIsDesktop] = useState(false);
  
  // Parallax Setup
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // GSAP Refs
  const heroRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const glitchRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);
  const desktopContentRef = useRef<HTMLDivElement>(null);
  const mobileContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // GSAP ScrollTrigger Animation
  useEffect(() => {
    if (!isDesktop) return; // Completely disable GSAP on mobile for native scrolling

    let ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "+=1200",
          scrub: 1,
          pin: true,
          pinSpacing: false,
          anticipatePin: 1
        }
      });

      // Background Zoom (Desktop)
      tl.to(bgRef.current, { scale: 2.5, filter: 'brightness(0.1) blur(10px)', duration: 2, force3D: true, rotation: 0.01 }, 0);

      // Desktop Fly-Through Sequence
      if (numberRef.current) tl.to(numberRef.current, { scale: 15, opacity: 0, duration: 1, ease: "power2.in", force3D: true, rotation: 0.01 }, 0);
      if (glitchRef.current) tl.to(glitchRef.current, { scale: 8, opacity: 0, duration: 1.5, ease: "power2.in", force3D: true, rotation: 0.01 }, 0.2);
      if (desktopContentRef.current) tl.to(desktopContentRef.current, { opacity: 0, y: -50, scale: 0.9, duration: 0.8, force3D: true }, 0);
      
    }, heroRef);

    return () => ctx.revert();
  }, [isDesktop]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDesktop) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    
    const xPos = (clientX / innerWidth) * 2 - 1;
    const yPos = (clientY / innerHeight) * 2 - 1;
    
    mouseX.set(xPos);
    mouseY.set(yPos);
  };

  // Parallax Depth Transforms
  const bgX = useTransform(mouseX, [-1, 1], [20, -20]);
  const bgY = useTransform(mouseY, [-1, 1], [20, -20]);
  
  const textX = useTransform(mouseX, [-1, 1], [40, -40]);
  const textY = useTransform(mouseY, [-1, 1], [40, -40]);
  
  const numberX = useTransform(mouseX, [-1, 1], [120, -120]);
  const numberY = useTransform(mouseY, [-1, 1], [120, -120]);
  
  const particlesX = useTransform(mouseX, [-1, 1], [200, -200]);
  const particlesY = useTransform(mouseY, [-1, 1], [200, -200]);

  return (
    <div 
      ref={heroRef}
      className="relative min-h-[100dvh] w-full bg-background overflow-hidden selection:bg-primary/50 flex flex-col"
      onMouseMove={handleMouseMove}
    >
      <CustomCursor />
      
      {/* 4-LAYER 3D PARALLAX SCENE */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden">
        
        {/* Layer 1: Background HUD Image */}
        <div ref={bgRef} className="absolute inset-0 w-full h-full flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1.05 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-[-5%] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hud_bg.png')", x: bgX, y: bgY }}
        />
        </div>
        
        {/* Environment Overlays */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Layer 2: "GLITCH" Typography & Top Text (Desktop Only) */}
        <div ref={glitchRef} className="hidden xl:flex absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full justify-center pointer-events-none z-10">
          <motion.div 
            style={{ x: textX, y: textY }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center justify-center w-full"
          >
          <div className="text-center mb-4 max-w-lg drop-shadow-[0_0_10px_rgba(227,6,19,0.8)]">
            <p className="font-inter text-[11px] md:text-sm tracking-[0.2em] text-gray-300 font-bold mb-1">
              SOMETIMES, ALL IT TAKES IS <span className="text-primary">36 HOURS</span>
            </p>
            <p className="font-inter text-[11px] md:text-sm tracking-[0.2em] text-gray-300 font-bold">
              TO CHANGE AN IDEA INTO A <span className="text-primary">REAL SOLUTION</span>
            </p>
          </div>
          
          <h1 className="font-rubik_glitch text-[12vw] xl:text-[150px] leading-none text-white tracking-widest glitch-text relative z-10">
            GLITCH
          </h1>
          </motion.div>
        </div>

        {/* Layer 3: "36" Typography (Hollow Neon Style) & Bottom Text (Desktop Only) */}
        <div ref={numberRef} className="hidden xl:flex absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full justify-center pointer-events-none z-20">
          <motion.div 
            style={{ x: numberX, y: numberY }}
            initial={{ opacity: 0, scale: 0.5, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 5 }}
            transition={{ duration: 1.5, delay: 0.5, type: "spring", bounce: 0.5 }}
            className="flex flex-col items-center justify-center w-full"
          >
          <h2 
            className="font-anton text-[15vw] xl:text-[180px] leading-none tracking-tighter select-none"
            style={{ 
              WebkitTextStroke: '4px #E30613', 
              color: 'transparent'
            }}
          >
            36
          </h2>
          
          <div className="text-center mt-2 drop-shadow-[0_0_10px_rgba(227,6,19,0.8)] mb-8">
             <p className="font-inter text-[11px] tracking-[0.2em] text-gray-400 font-bold">&lt;CODE&gt;</p>
             <p className="font-inter text-[11px] tracking-[0.2em] text-white font-bold my-1">CONQUER</p>
             <p className="font-inter text-[11px] tracking-[0.2em] text-gray-400 font-bold">&lt;/CODE&gt;</p>
          </div>
          </motion.div>
        </div>



        {/* Layer 4: Parallax Particles */}
        <motion.div 
          style={{ x: particlesX, y: particlesY }}
          className="absolute inset-0"
        >
           {[...Array(25)].map((_, i) => (
             <motion.div
               key={i}
               className="absolute w-1 h-1 bg-white rounded-full opacity-40 shadow-[0_0_10px_white]"
               style={{
                 top: `${Math.random() * 100}%`,
                 left: `${Math.random() * 100}%`,
                 width: Math.random() * 3 + 1 + 'px',
                 height: Math.random() * 3 + 1 + 'px',
               }}
               animate={{
                 y: [0, -200],
                 opacity: [0, 0.8, 0],
               }}
               transition={{
                 duration: Math.random() * 5 + 3,
                 repeat: Infinity,
                 ease: "linear",
                 delay: Math.random() * 3
               }}
             />
           ))}
        </motion.div>
      </div>

      {/* DESKTOP MAIN CONTENT (Hidden on Mobile) */}
      <div ref={desktopContentRef} className="hidden xl:flex relative z-50 flex-1 flex-col pt-16 pb-2 px-12 w-full max-w-[1600px] mx-auto pointer-events-none">
        
        {/* Middle Section (Left Panel, empty center, Right Panel) */}
        <div className="flex-1 flex flex-col xl:flex-row justify-between items-center w-full gap-12 xl:gap-0 my-12 xl:my-0">
           <LeftPanel />
           <div className="hidden xl:block flex-1"></div>
           <RightPanel />
        </div>

        {/* Bottom Section */}
        <BottomTracks />
      </div>

      {/* MOBILE MAIN CONTENT (Scrollable Vertical Card Stack) */}
      <div ref={mobileContentRef} className="xl:hidden relative z-50 w-full flex-1">
        <MobileHero />
      </div>
    </div>
  );
}
