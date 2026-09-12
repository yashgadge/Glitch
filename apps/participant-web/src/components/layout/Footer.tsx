import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full bg-[#050505] border-t border-white/5 pt-16 pb-8 px-6 md:px-12 z-10 relative">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
        {/* Brand */}
        <div className="space-y-4">
          <div className="flex items-center gap-1">
            <span className="font-bebas text-4xl text-white tracking-wider">GLITCH</span>
            <span className="font-bebas text-2xl text-primary mt-1">36</span>
          </div>
          <p className="font-inter text-sm text-gray-400">
            A premier technology hackathon fostering innovation, design, and development.
          </p>
          <p className="font-inter text-xs text-gray-500 pt-2">
            Organized by: <br />
            <strong>GLITCH 36</strong><br />
            Individual
          </p>
        </div>

        {/* Event */}
        <div>
          <h4 className="font-bebas text-xl text-white tracking-widest mb-4">EVENT</h4>
          <ul className="space-y-2 font-inter text-sm text-gray-400">
            <li><Link to="/event" className="hover:text-primary transition-colors">About GLITCH 36</Link></li>
            <li><Link to="/event" className="hover:text-primary transition-colors">Event Details</Link></li>
            <li><Link to="/competition-rules" className="hover:text-primary transition-colors">Competition Rules</Link></li>
            <li><Link to="/prizes" className="hover:text-primary transition-colors">Prizes & Awards</Link></li>
          </ul>
        </div>

        {/* Registration */}
        <div>
          <h4 className="font-bebas text-xl text-white tracking-widest mb-4">REGISTRATION</h4>
          <ul className="space-y-2 font-inter text-sm text-gray-400">
            <li><Link to="/register" className="hover:text-primary transition-colors">Register Now</Link></li>
            <li><Link to="/registration-fees" className="hover:text-primary transition-colors">Registration & Fees</Link></li>
            <li><Link to="/refund-policy" className="hover:text-primary transition-colors">Cancellation & Refund</Link></li>
          </ul>
        </div>

        {/* Policies & Support */}
        <div>
          <h4 className="font-bebas text-xl text-white tracking-widest mb-4">SUPPORT & POLICIES</h4>
          <ul className="space-y-2 font-inter text-sm text-gray-400">
            <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
            <li><Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
            <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
        <p className="font-inter text-xs text-gray-500">
          &copy; {new Date().getFullYear()} GLITCH 36. All rights reserved.
        </p>
        <p className="font-inter text-[10px] tracking-widest text-gray-600 font-bold">POWERED BY DEVNOVATE.CO</p>
      </div>
    </footer>
  );
}
