export default function PrivacyPolicy() {
  return (
    <div className="w-full max-w-[800px] mx-auto px-6 md:px-12 py-16 mt-8 font-inter text-gray-300">
      <h1 className="font-bebas text-5xl md:text-6xl text-white mb-2 tracking-widest">PRIVACY <span className="text-primary">POLICY</span></h1>
      <p className="text-sm text-gray-500 mb-12">Last Updated: October 2023</p>

      <div className="space-y-8">
        <section>
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-4 border-b border-white/10 pb-2">1. INFORMATION WE COLLECT</h2>
          <p className="mb-4">We collect information that you provide directly to us when registering for the hackathon, including:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Personal Information:</strong> Name, email address, phone number, and college affiliation.</li>
            <li><strong>Team Information:</strong> Team name, track selection, and member relationships.</li>
            <li><strong>Payment Information:</strong> Handled securely by our payment gateway (Razorpay). We do not store full credit card numbers or UPI PINs on our servers.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-4 border-b border-white/10 pb-2">2. HOW WE USE YOUR INFORMATION</h2>
          <p className="mb-4">The information we collect is used to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Facilitate your registration and participation in the event.</li>
            <li>Generate your unique Digital Pass for venue entry and attendance tracking.</li>
            <li>Communicate important event updates, schedules, and announcements.</li>
            <li>Process payments and manage optional add-ons like food passes.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-4 border-b border-white/10 pb-2">3. DATA SHARING & DISCLOSURE</h2>
          <p>
            We do not sell your personal data. We may share necessary information with trusted third-party service providers (like payment gateways and hosting platforms) strictly for the purpose of operating the event. We may also disclose information if required by law.
          </p>
        </section>

        <section>
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-4 border-b border-white/10 pb-2">4. DATA SECURITY</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. Our platform utilizes secure protocols (HTTPS) and authenticated databases (Firebase).
          </p>
        </section>

        <section>
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-4 border-b border-white/10 pb-2">5. YOUR RIGHTS</h2>
          <p>
            You have the right to access, correct, or request deletion of your personal data. If you wish to exercise these rights, please contact us using the information provided on the Contact page.
          </p>
        </section>
      </div>
    </div>
  );
}
