export default function CompetitionRules() {
  return (
    <div className="w-full max-w-[800px] mx-auto px-6 md:px-12 py-16 mt-8 font-inter text-gray-300">
      <h1 className="font-bebas text-5xl md:text-6xl text-white mb-2 tracking-widest">COMPETITION <span className="text-primary">RULES</span></h1>
      <p className="text-sm text-gray-500 mb-12">Official Rules for GLITCH 36 Hackathon</p>

      <div className="space-y-8">
        <section>
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-4 border-b border-white/10 pb-2">1. TEAM FORMATION</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Teams must consist of exactly 1 to 4 members.</li>
            <li>All team members must be registered and verified on the platform.</li>
            <li>A participant can only be part of one team at a time.</li>
            <li>Once the registration fee is paid, the team is locked and no members can be added or removed.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-4 border-b border-white/10 pb-2">2. PROJECT DEVELOPMENT</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>All design elements, code, hardware builds, and assets must be created during the 36-hour event duration.</li>
            <li>Using third-party APIs, open-source libraries, and frameworks is highly encouraged, provided they are freely available to all participants.</li>
            <li>Pre-existing projects or code written before the hackathon begins are strictly prohibited and will result in immediate disqualification.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-4 border-b border-white/10 pb-2">3. SUBMISSION GUIDELINES</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Teams must submit their projects through the official GLITCH 36 participant dashboard before the deadline.</li>
            <li>Late submissions will not be accepted under any circumstances unless an official extension is announced by the organizers.</li>
            <li>Submissions must include a link to the source code repository (e.g., GitHub) and a video demonstration or presentation deck as required by the specific track.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-4 border-b border-white/10 pb-2">4. JUDGING PROCESS</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Projects will be evaluated by an expert panel of judges.</li>
            <li>Standard judging criteria include: Innovation & Creativity (25%), Technical Complexity (25%), Business Value/Impact (25%), and Design/UX (25%).</li>
            <li>The judges' decisions are final and binding.</li>
            <li><strong>Important Note:</strong> The payment of the registration fee does not influence the judging process or guarantee any prize.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-4 border-b border-white/10 pb-2">5. CODE OF CONDUCT</h2>
          <p>
            GLITCH 36 is a safe, inclusive environment. Harassment of any kind, discriminatory behavior, or sabotage of other teams' projects is strictly forbidden and will result in immediate expulsion from the event without refund.
          </p>
        </section>
      </div>
    </div>
  );
}
