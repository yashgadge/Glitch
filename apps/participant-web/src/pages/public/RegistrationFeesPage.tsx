import { useState, useEffect } from 'react';
import { Check, ShieldCheck, Ticket, Calendar, Utensils, Wifi, Briefcase, Package } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@shared/lib/firebase';
import type { CatalogItem } from '@shared/types/models';

export default function RegistrationFeesPage() {
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [feeAmount, setFeeAmount] = useState(1500);
  const [addonsLoading, setAddonsLoading] = useState(true);
  const [feeLoading, setFeeLoading] = useState(true);

  useEffect(() => {
    // Fetch Addons
    const qCatalog = query(collection(db, 'eventProducts'), where('isActive', '==', true));
    const unsub = onSnapshot(qCatalog, (snap) => {
      const prods: CatalogItem[] = [];
      snap.forEach(doc => {
        prods.push({ id: doc.id, ...doc.data() } as CatalogItem);
      });
      setProducts(prods);
      setAddonsLoading(false);
    }, (error) => {
      console.error("Error fetching addons:", error);
      setAddonsLoading(false);
    });

    // Fetch Config for Fee
    getDoc(doc(db, 'system', 'eventConfig')).then(docSnap => {
      if (docSnap.exists()) {
        const config = docSnap.data();
        if (config.registrationFeeAmount !== undefined) {
          setFeeAmount(config.registrationFeeAmount);
        }
      }
      setFeeLoading(false);
    }).catch(err => {
      console.error("Error fetching fee:", err);
      setFeeLoading(false);
    });

    return () => unsub();
  }, []);

  const addons = products.filter(p => p.type !== 'registration');

  const regPrice = feeAmount;
  const regName = "TEAM REGISTRATION";
  const regDesc = null;

  return (
    <div className="w-full max-w-[1000px] mx-auto px-6 md:px-12 py-16 mt-8">
      <div className="flex flex-col items-center mb-16 text-center">
        <h1 className="font-bebas text-5xl md:text-7xl text-white mb-4 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          REGISTRATION & <span className="text-primary drop-shadow-[0_0_20px_rgba(227,6,19,0.8)]">FEES</span>
        </h1>
        <div className="w-32 h-1 bg-primary/50 shadow-[0_0_15px_rgba(227,6,19,1)] mb-6"></div>
        <p className="font-inter text-gray-400 text-lg max-w-2xl">
          Everything you need to know about registering for GLITCH 36 and what your payment covers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {/* Registration Fee Card */}
        <Card className="bg-black/60 border-primary/30 shadow-[0_0_30px_rgba(227,6,19,0.1)] relative overflow-hidden h-full">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_20px_rgba(227,6,19,1)]" />
          <CardContent className="p-8 h-full flex flex-col">
            <h2 className="font-bebas text-3xl text-white tracking-widest mb-2 flex items-center gap-3 uppercase">
              <Ticket className="w-8 h-8 text-primary shrink-0" /> {regName}
            </h2>
            <div className="flex items-end gap-2 mb-6 border-b border-white/10 pb-6">
              <span className="font-bebas text-6xl text-primary tracking-wider">
                {feeLoading ? '...' : `₹${regPrice}`}
              </span>
              <span className="font-inter text-gray-400 mb-2">/ per team</span>
            </div>
            
            <h3 className="font-bebas text-xl text-gray-300 tracking-wider mb-4">WHAT'S INCLUDED:</h3>
            {regDesc ? (
              <p className="font-inter text-gray-300 mb-4 whitespace-pre-wrap">{regDesc}</p>
            ) : (
              <ul className="space-y-4 font-inter text-gray-300 flex-grow">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span><strong>Hackathon Participation:</strong> Full 36-hour access for up to 4 team members.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span><strong>Workspace:</strong> Dedicated team desk, power outlets, and 24/7 facility access.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span><strong>High-Speed Wi-Fi:</strong> Uninterrupted internet access for development.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span><strong>Mentorship:</strong> Access to industry experts and technical mentors.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span><strong>Digital Pass:</strong> Official entry and identity QR for all members.</span>
                </li>
              </ul>
            )}
            <p className="text-xs text-gray-500 font-inter mt-6 italic">
              * The registration fee is strictly for event participation and services. It does not guarantee any prizes or favorable judging outcomes.
            </p>
          </CardContent>
        </Card>

        {/* Optional Services Card */}
        <Card className="bg-white/5 border-white/10 relative overflow-hidden h-full">
          <div className="absolute top-0 left-0 w-full h-1 bg-white/20" />
          <CardContent className="p-8 h-full flex flex-col">
            <h2 className="font-bebas text-3xl text-white tracking-widest mb-6 flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-gray-400 shrink-0" /> OPTIONAL ADD-ONS
            </h2>
            <p className="font-inter text-sm text-gray-400 mb-6">
              To keep the base registration fee accessible for everyone, premium services like food and accommodation are completely optional and charged separately. Available add-ons will be listed below when active.
            </p>
            
            <div className="space-y-4 flex-grow overflow-y-auto pr-2 custom-scrollbar">
              {addonsLoading ? (
                <div className="text-gray-500 font-inter text-sm animate-pulse">Loading add-ons...</div>
              ) : addons.length > 0 ? (
                addons.map(addon => (
                  <div key={addon.id} className="bg-black/40 p-4 rounded-lg border border-white/5">
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="font-bebas text-xl text-white tracking-widest flex items-center gap-2 mb-2">
                        {addon.type === 'food' ? <Utensils className="w-5 h-5 text-primary" /> : 
                         addon.type === 'stay' ? <Calendar className="w-5 h-5 text-primary" /> : 
                         <Package className="w-5 h-5 text-primary" />}
                        <span className="uppercase">{addon.name}</span>
                      </h4>
                      <span className="font-bebas text-xl text-primary whitespace-nowrap">₹{addon.price}</span>
                    </div>
                    {addon.description && (
                      <p className="font-inter text-sm text-gray-400 whitespace-pre-wrap">{addon.description}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 font-inter text-sm italic">
                  No optional add-ons are currently active. Please check back later.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-16">
        <h3 className="font-bebas text-3xl text-white tracking-widest mb-6">PAYMENT & CONFIRMATION PROCESS</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bebas text-2xl">1</div>
            <h4 className="font-bebas text-xl text-white tracking-widest">TEAM LEADER PAYS</h4>
            <p className="font-inter text-sm text-gray-400">The team leader must pay the base registration fee to lock the team and confirm participation.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bebas text-2xl">2</div>
            <h4 className="font-bebas text-xl text-white tracking-widest">DIGITAL PASSES GENERATED</h4>
            <p className="font-inter text-sm text-gray-400">Once payment is successfully verified, Digital Passes are instantly generated for all locked team members.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bebas text-2xl">3</div>
            <h4 className="font-bebas text-xl text-white tracking-widest">ADD-ONS UNLOCKED</h4>
            <p className="font-inter text-sm text-gray-400">After the base registration is confirmed, the team leader can purchase optional passes from the dashboard catalog.</p>
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <p className="font-inter text-gray-400 mb-6">
          Payments are securely processed. We do not store your credit card information. <br/>
          By proceeding with payment, you agree to our policies.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="/terms" className="font-inter text-sm text-primary hover:text-white underline transition-colors">Terms & Conditions</a>
          <span className="text-gray-600">|</span>
          <a href="/refund-policy" className="font-inter text-sm text-primary hover:text-white underline transition-colors">Cancellation & Refund Policy</a>
        </div>
      </div>
    </div>
  );
}
