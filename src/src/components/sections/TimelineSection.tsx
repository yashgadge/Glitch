import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EventConfigService } from '@shared/services/EventConfigService';
import type { EventTimelineItem } from '@shared/types/models';

const defaultDay1 = [
  { time: "08:00 AM", title: "Registration & Check-In", desc: "Get your swag bags, ID badges, and find your designated hacking stations." },
  { time: "09:00 AM", title: "Opening Ceremony", desc: "Keynote speakers, track announcements, and the official start countdown." },
  { time: "10:00 AM", title: "Problem Statement Release", desc: "The official problem statements are revealed to all participants." },
  { time: "10:30 AM", title: "Hackathon Begins 🚀", desc: "36 hours on the clock. Start building." },
  { time: "03:00 PM", title: "Mentorship Session", desc: "Industry experts will circulate to provide feedback on initial architecture." },
  { time: "07:00 PM", title: "Dinner Break 🍽️", desc: "Fuel up for the night shift." },
  { time: "09:00 PM", title: "Progress Checkpoint", desc: "Quick check-in on your team's progress." },
  { time: "11:00 PM", title: "Fun & Networking Session 🎉", desc: "Take a break, play some games, and network with other hackers." },
];

const defaultDay2 = [
  { time: "08:00 AM", title: "Breakfast & Refresh", desc: "Morning fuel to push through the final stretch." },
  { time: "11:00 AM", title: "Final Checkpoint", desc: "Last mentor feedback before submissions." },
  { time: "01:00 PM", title: "Final Submission 📥", desc: "Keyboards down. Code freeze and project submissions." },
  { time: "02:00 PM", title: "Project Evaluation ⚖️", desc: "Present your solutions to the judges." },
  { time: "05:30 PM", title: "Results & Prize Distribution 🏆", desc: "Winners announced and prizes distributed." },
  { time: "08:30 PM", title: "Closing Ceremony 🎊", desc: "Official closing of the hackathon." },
];

export default function TimelineSection() {
  const [timeline, setTimeline] = useState<EventTimelineItem[]>([]);

  useEffect(() => {
    const unsub = EventConfigService.subscribeToConfig((config) => {
      if (config && config.timeline) {
        setTimeline(config.timeline);
      }
    });
    return () => unsub();
  }, []);

  const customDay1 = timeline.filter(t => t.day === 1).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()).map(t => ({
    time: new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    title: t.title,
    desc: t.description
  }));
  
  const customDay2 = timeline.filter(t => t.day === 2).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()).map(t => ({
    time: new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    title: t.title,
    desc: t.description
  }));

  const day1Schedule = customDay1.length > 0 ? customDay1 : defaultDay1;
  const day2Schedule = customDay2.length > 0 ? customDay2 : defaultDay2;

  return (
    <section id="schedule" className="py-24 px-6 md:px-12 w-full max-w-[1000px] mx-auto relative z-10">
      <div className="flex flex-col items-center mb-16">
        <h2 className="font-bebas text-5xl md:text-7xl text-white mb-4 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          THE <span className="text-primary drop-shadow-[0_0_20px_rgba(227,6,19,0.8)]">TIMELINE</span>
        </h2>
        <div className="w-32 h-1 bg-primary/50 shadow-[0_0_15px_rgba(227,6,19,1)]"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-[1200px] mx-auto">
        
        {/* Day 1 Column */}
        <div>
          <h3 className="font-bebas text-4xl text-white mb-8 tracking-widest text-center md:text-left drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            <span className="text-primary drop-shadow-[0_0_15px_rgba(227,6,19,0.8)]">DAY 1</span> (OCT 10)
          </h3>
          <div className="relative border-l-2 border-primary/30 ml-4 md:ml-8" style={{ perspective: 1000 }}>
            {day1Schedule.map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.5, rotateY: 90, rotateZ: -5, y: 100, x: 50 }}
                whileInView={{ opacity: 1, scale: 1, rotateY: 0, rotateZ: 0, y: 0, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: idx * 0.1, type: "spring", bounce: 0.3 }}
                className="mb-10 ml-8 relative transform-gpu"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Timeline Dot */}
                <div className="absolute -left-[41px] top-1.5 w-4 h-4 bg-black border-2 border-primary rounded-full shadow-[0_0_10px_rgba(227,6,19,0.8)]"></div>
                
                {/* Timeline Content */}
                <div className="hud-glass bg-black/40 backdrop-blur-md border border-white/5 p-6 rounded-xl hover:border-primary/30 transition-colors">
                  <div className="mb-2">
                    <span className="font-bebas text-2xl text-primary tracking-wider">{item.time}</span>
                  </div>
                  <h3 className="font-bebas text-xl text-white tracking-widest mb-2">{item.title}</h3>
                  <p className="font-inter text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Day 2 Column */}
        <div>
          <h3 className="font-bebas text-4xl text-white mb-8 tracking-widest text-center md:text-left drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            <span className="text-primary drop-shadow-[0_0_15px_rgba(227,6,19,0.8)]">DAY 2</span> (OCT 11)
          </h3>
          <div className="relative border-l-2 border-primary/30 ml-4 md:ml-8" style={{ perspective: 1000 }}>
            {day2Schedule.map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.5, rotateY: 90, rotateZ: -5, y: 100, x: 50 }}
                whileInView={{ opacity: 1, scale: 1, rotateY: 0, rotateZ: 0, y: 0, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: idx * 0.1, type: "spring", bounce: 0.3 }}
                className="mb-10 ml-8 relative transform-gpu"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Timeline Dot */}
                <div className="absolute -left-[41px] top-1.5 w-4 h-4 bg-black border-2 border-primary rounded-full shadow-[0_0_10px_rgba(227,6,19,0.8)]"></div>
                
                {/* Timeline Content */}
                <div className="hud-glass bg-black/40 backdrop-blur-md border border-white/5 p-6 rounded-xl hover:border-primary/30 transition-colors">
                  <div className="mb-2">
                    <span className="font-bebas text-2xl text-primary tracking-wider">{item.time}</span>
                  </div>
                  <h3 className="font-bebas text-xl text-white tracking-widest mb-2">{item.title}</h3>
                  <p className="font-inter text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
