import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Home from './Home';
import Navbar from '../components/layout/Navbar';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {

  useEffect(() => {
    // Check for secret URL parameter to open staff gateway
    const params = new URLSearchParams(window.location.search);
    if (params.get('access') === 'mission-control') {
      // Clean up the URL so it doesn't linger in history or address bar
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    // Expose lenis globally for perfect Navbar anchor scrolling
    (window as any).lenis = lenis;

    // Sync Lenis with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove((time) => {
        lenis.raf(time * 1000);
      });
      lenis.destroy();
    };
  }, []);

  return (
    <div className="antialiased text-white selection:bg-primary/50">
      <Navbar />
      <Home />
    </div>
  );
}
