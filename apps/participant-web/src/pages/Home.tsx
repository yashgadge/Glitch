import Hero from '../components/hero/Hero';
import HowRegistrationWorks from '../components/sections/HowRegistrationWorks';
import RegistrationFeesSection from '../components/sections/RegistrationFeesSection';
import AboutSection from '../components/sections/AboutSection';
import TracksSection from '../components/sections/TracksSection';
import PrizesSection from '../components/sections/PrizesSection';
import TimelineSection from '../components/sections/TimelineSection';
import FaqSection from '../components/sections/FaqSection';
import ContactSection from '../components/sections/ContactSection';

export default function Home() {
  return (
    <main className="w-full bg-background relative">
      <Hero />
      
      {/* Spacer to sync with Hero's 1200px GSAP pin duration (Desktop Only) */}
      <div className="hidden xl:block h-[1200px]" />
      
      <div className="relative z-10 bg-background flex flex-col items-center">
        <HowRegistrationWorks />
        <RegistrationFeesSection />
        <TracksSection />
        <PrizesSection />
        <TimelineSection />
        <AboutSection />
        <FaqSection />
        <ContactSection />
      </div>
    </main>
  );
}
