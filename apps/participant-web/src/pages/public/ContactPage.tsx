import { Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';

export default function ContactPage() {
  return (
    <div className="w-full max-w-[1000px] mx-auto px-6 md:px-12 py-16 mt-8">
      <div className="flex flex-col items-center mb-16 text-center">
        <h1 className="font-bebas text-5xl md:text-7xl text-white mb-4 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          CONTACT <span className="text-primary drop-shadow-[0_0_20px_rgba(227,6,19,0.8)]">US</span>
        </h1>
        <div className="w-32 h-1 bg-primary/50 shadow-[0_0_15px_rgba(227,6,19,1)] mb-6"></div>
        <p className="font-inter text-gray-400 text-lg max-w-2xl">
          Have questions about registration, rules, or the event? We're here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-4">
              <Mail className="w-8 h-8" />
            </div>
            <h3 className="font-bebas text-2xl text-white tracking-widest mb-2">EMAIL SUPPORT</h3>
            <p className="font-inter text-gray-400 text-sm mb-4">For general inquiries and support.</p>
            <a href="mailto:yashgadge33@gmail.com" className="text-primary hover:text-white transition-colors">yashgadge33@gmail.com</a>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-4">
              <Phone className="w-8 h-8" />
            </div>
            <h3 className="font-bebas text-2xl text-white tracking-widest mb-2">PHONE</h3>
            <p className="font-inter text-gray-400 text-sm mb-4">Available during business hours.</p>
            <p className="text-gray-300 text-sm">Not publicly listed</p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="font-bebas text-2xl text-white tracking-widest mb-2">VENUE / OFFICE</h3>
            <p className="font-inter text-gray-400 text-sm mb-4">Event location and registered address.</p>
            <p className="text-gray-300 text-sm">JSPM Wagholi</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-[800px] mx-auto text-center">
        <h3 className="font-bebas text-3xl text-white tracking-widest mb-4">ORGANIZER DETAILS</h3>
        <p className="font-inter text-gray-400 mb-2"><strong>Legal Name:</strong> Yash Gadge</p>
        <p className="font-inter text-gray-400 mb-2"><strong>Entity Type:</strong> Individual</p>
        <p className="font-inter text-gray-400"><strong>Address:</strong> JSPM Wagholi</p>
      </div>
    </div>
  );
}
