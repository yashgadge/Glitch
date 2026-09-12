import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Check } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { collection, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import { db } from '@shared/lib/firebase';
import type { CatalogItem } from '@shared/types/models';

export default function RegistrationFeesSection() {
  const [regPrice, setRegPrice] = useState<number>(1500);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getDoc(doc(db, 'system', 'eventConfig')).then(docSnap => {
      if (docSnap.exists()) {
        const config = docSnap.data();
        if (config.registrationFeeAmount !== undefined) {
          setRegPrice(config.registrationFeeAmount);
        }
      }
      setLoading(false);
    }).catch(err => {
      console.error("Error fetching fee:", err);
      setLoading(false);
    });
  }, []);

  const displayPrice = regPrice;

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-[1000px] mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center mb-12">
          <h2 className="font-bebas text-4xl md:text-5xl lg:text-6xl text-white mb-4 tracking-widest">
            REGISTRATION & <span className="text-primary drop-shadow-[0_0_15px_rgba(227,6,19,0.5)]">FEES</span>
          </h2>
          <p className="font-inter text-gray-400 max-w-2xl mx-auto">
            Transparent pricing for event participation. No hidden costs.
          </p>
        </div>

        <Card className="bg-black/60 border-primary/30 shadow-[0_0_30px_rgba(227,6,19,0.15)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_20px_rgba(227,6,19,1)]" />
          <CardContent className="p-8 md:p-12 flex flex-col md:flex-row gap-12 items-center">
            
            <div className="flex-1">
              <h3 className="font-bebas text-3xl text-white tracking-widest mb-2 flex items-center gap-3">
                <Ticket className="w-8 h-8 text-primary" /> TEAM PARTICIPATION
              </h3>
              <div className="flex items-end gap-2 mb-6 border-b border-white/10 pb-6">
                <span className="font-bebas text-6xl text-primary tracking-wider">
                  {loading ? '...' : `₹${displayPrice}`}
                </span>
                <span className="font-inter text-gray-400 mb-2">/ per team (max 4 members)</span>
              </div>
              
              <ul className="space-y-4 font-inter text-gray-300 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>36-hour hackathon access & dedicated workspace</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>High-speed Wi-Fi and mentorship</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Official Digital Pass for venue entry</span>
                </li>
              </ul>
              
              <p className="text-xs text-gray-500 font-inter italic mb-6">
                * Note: Optional add-ons can be purchased separately after team registration.
              </p>
            </div>
            
            <div className="w-full md:w-auto flex flex-col gap-4">
              <Link to="/register" className="w-full text-center bg-primary text-white font-bebas tracking-wider px-8 py-4 rounded hover:bg-primary/90 transition-colors text-xl shadow-[0_0_15px_rgba(227,6,19,0.5)]">
                REGISTER NOW
              </Link>
              <Link to="/registration-fees" className="w-full text-center bg-white/5 border border-white/20 text-white font-bebas tracking-wider px-8 py-4 rounded hover:bg-white/10 transition-colors text-xl">
                VIEW FULL DETAILS
              </Link>
            </div>
            
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
