import { UserPlus, Users, CreditCard, QrCode, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  {
    icon: UserPlus,
    title: "1. Create Profile",
    description: "Register with your basic details and verify your email."
  },
  {
    icon: Users,
    title: "2. Form a Team",
    description: "Create a new team or join an existing one using an invite code (max 4 members)."
  },
  {
    icon: CreditCard,
    title: "3. Pay Registration Fee",
    description: "Team leader pays the ₹500 fee to confirm participation and lock the team."
  },
  {
    icon: QrCode,
    title: "4. Get Digital Pass",
    description: "Once paid, Digital Passes are instantly generated for all team members."
  },
  {
    icon: Zap,
    title: "5. Hack & Build",
    description: "Arrive at the venue, scan your pass, and start building!"
  }
];

export default function HowRegistrationWorks() {
  return (
    <section className="py-24 relative overflow-hidden bg-[#0a0a0a]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-bebas text-4xl md:text-5xl lg:text-6xl text-white mb-4 tracking-widest">
            HOW REGISTRATION <span className="text-primary drop-shadow-[0_0_15px_rgba(227,6,19,0.5)]">WORKS</span>
          </h2>
          <p className="font-inter text-gray-400 max-w-2xl mx-auto">
            A simple, transparent process from sign-up to hackathon check-in.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {steps.map((step, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 hover:border-primary/50 transition-all duration-300"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-primary mb-4 shadow-[0_0_15px_rgba(227,6,19,0.3)]">
                <step.icon className="w-8 h-8" />
              </div>
              <h3 className="font-bebas text-xl text-white tracking-wider mb-2">{step.title}</h3>
              <p className="font-inter text-sm text-gray-400 leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
