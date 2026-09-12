import { motion } from 'framer-motion';

export default function AboutSection() {
  return (
    <section id="about" className="py-32 px-6 md:px-12 w-full max-w-[1400px] mx-auto relative z-10 flex flex-col items-center">
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center text-center max-w-3xl"
      >
        <h2 className="font-bebas text-5xl md:text-7xl text-white mb-6 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          THE <span className="text-primary drop-shadow-[0_0_20px_rgba(227,6,19,0.8)]">MISSION</span>
        </h2>
        <div className="w-24 h-1 bg-primary/50 mb-10 shadow-[0_0_15px_rgba(227,6,19,1)]"></div>
        <p className="font-inter text-gray-300 text-lg md:text-xl leading-relaxed font-light mb-8">
          GLITCH 36 is not just a hackathon; it's a 36-hour crucible for innovation. 
          We bring together the brightest minds, the boldest thinkers, and the most relentless builders 
          to tackle real-world problems.
        </p>
        <p className="font-inter text-gray-400 text-md md:text-lg leading-relaxed font-light">
          Whether you're developing next-generation AI, securing the future of finance, or 
          engineering sustainable cities, your ideas have the power to disrupt the status quo. 
          Break the system. Build the future.
        </p>
      </motion.div>
    </section>
  );
}
