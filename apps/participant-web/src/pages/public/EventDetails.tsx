import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Zap } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';

export default function EventDetails() {
  return (
    <div className="w-full max-w-[1000px] mx-auto px-6 md:px-12 py-16 mt-8">
      <div className="flex flex-col items-center mb-16 text-center">
        <h1 className="font-bebas text-5xl md:text-7xl text-white mb-4 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          ABOUT <span className="text-primary drop-shadow-[0_0_20px_rgba(227,6,19,0.8)]">GLITCH 36</span>
        </h1>
        <div className="w-32 h-1 bg-primary/50 shadow-[0_0_15px_rgba(227,6,19,1)] mb-6"></div>
        <p className="font-inter text-gray-400 text-lg max-w-2xl">
          A premier 36-hour technology hackathon challenging the brightest minds to build innovative solutions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 items-center">
        <div>
          <h2 className="font-bebas text-3xl text-white tracking-widest mb-4">WHAT IS IT?</h2>
          <p className="font-inter text-gray-300 leading-relaxed mb-6">
            GLITCH 36 is an intense, non-stop 36-hour hackathon designed to test the limits of your creativity, technical skills, and endurance. Participants form teams to conceptualize, design, and build software or hardware solutions to real-world problems.
          </p>
          <p className="font-inter text-gray-300 leading-relaxed">
            It is a collaborative educational event. While prizes are awarded to the most outstanding projects based on rigorous judging criteria, the primary focus is on learning, networking, and pushing the boundaries of what you can build in a weekend.
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="font-bebas text-3xl text-white">36</div>
              <div className="font-inter text-xs text-gray-400">HOURS NON-STOP</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="font-bebas text-3xl text-white">4</div>
              <div className="font-inter text-xs text-gray-400">MEMBERS PER TEAM</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <Calendar className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="font-bebas text-xl text-white mt-1">2 DAYS</div>
              <div className="font-inter text-xs text-gray-400">OF INNOVATION</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="font-bebas text-xl text-white mt-1">IN-PERSON</div>
              <div className="font-inter text-xs text-gray-400">EVENT VENUE</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="bg-black/40 border border-white/10 rounded-2xl p-8 text-center mb-16">
        <h2 className="font-bebas text-3xl text-white tracking-widest mb-4">WHO IS THE EVENT FOR?</h2>
        <p className="font-inter text-gray-300 max-w-3xl mx-auto">
          GLITCH 36 is designed for college students, recent graduates, developers, designers, and innovators. Whether you are a seasoned competitive programmer or a first-time hacker looking to learn, there's a place for you. All participants must register and agree to the event rules.
        </p>
      </div>

      <div className="text-center">
        <h2 className="font-bebas text-3xl text-white tracking-widest mb-6">READY TO JOIN?</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/register" className="bg-primary text-white font-bebas tracking-wider px-8 py-3 rounded hover:bg-primary/90 transition-colors text-xl">
            REGISTER YOUR TEAM
          </Link>
          <Link to="/registration-fees" className="bg-transparent border border-white/20 text-white font-bebas tracking-wider px-8 py-3 rounded hover:bg-white/10 transition-colors text-xl">
            VIEW FEES & DETAILS
          </Link>
        </div>
      </div>
    </div>
  );
}
