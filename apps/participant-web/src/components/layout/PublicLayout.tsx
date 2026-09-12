import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import TopAnnouncement from './TopAnnouncement';
import Footer from './Footer';

export default function PublicLayout() {
  return (
    <div className="antialiased text-white bg-background min-h-screen flex flex-col selection:bg-primary/50">
      <div className="fixed top-0 left-0 right-0 z-[110] flex flex-col w-full">
        <TopAnnouncement />
        <Navbar />
      </div>
      
      {/* Spacer to push content below the fixed header (announcement + navbar) */}
      <div className="pt-24 md:pt-32" />
      
      <main className="flex-grow flex flex-col w-full relative z-10">
        <Outlet />
      </main>
      
      <Footer />
    </div>
  );
}
