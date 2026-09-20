import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Home from './Home';
import Navbar from '../components/layout/Navbar';
import TopAnnouncement from '../components/layout/TopAnnouncement';
import Footer from '../components/layout/Footer';

gsap.registerPlugin(ScrollTrigger);

  import { useNavigate } from 'react-router-dom';
  import { useAuth } from '@shared/contexts/AuthContext';

  export default function LandingPage() {
    const { user, profileData, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      // Auto-redirect authenticated users to dashboard instead of making them stay on landing page
      if (!loading && user && profileData?.registrationStatus === 'completed') {
        navigate('/dashboard', { replace: true });
      } else if (!loading && user && profileData?.registrationStatus === 'incomplete') {
        navigate('/register', { replace: true });
      }
    }, [user, profileData, loading, navigate]);

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
    <div className="antialiased text-white selection:bg-primary/50 flex flex-col min-h-screen">
      <div className="fixed top-0 left-0 right-0 z-[110] flex flex-col w-full">
        <TopAnnouncement />
        <Navbar />
      </div>
      <div className="flex-grow mobile-safe-bottom">
        <Home />
      </div>
      <Footer />
    </div>
  );
}
