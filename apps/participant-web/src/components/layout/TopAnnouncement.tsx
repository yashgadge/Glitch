import { Link } from 'react-router-dom';

export default function TopAnnouncement() {
  return (
    <div className="w-full bg-[#050505] border-b border-white/5 text-gray-400 text-xs md:text-sm font-inter py-3 px-4 text-center z-[110] relative">
      <p>
        <strong className="text-white">GLITCH 36 — Technology Hackathon.</strong> Registration fees cover hackathon participation and event services. 
        Judging and awards are conducted separately. 
        <Link to="/registration-fees" className="text-primary hover:text-white underline ml-2 font-bold transition-colors">Registration & Fees</Link>
        <span className="mx-2 opacity-30 text-white">|</span>
        <Link to="/competition-rules" className="text-primary hover:text-white underline font-bold transition-colors">Event Rules</Link>
      </p>
    </div>
  );
}
