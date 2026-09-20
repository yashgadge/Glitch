import React from 'react';
import { Clock } from 'lucide-react';

export default function RegistrationDeadlineBanner() {
  return (
    <div className="mb-6 bg-red-950/40 border border-red-500/30 rounded-lg p-3 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(227,6,19,0.15)] text-center">
      <Clock className="w-4 h-4 text-red-500" />
      <span className="font-bebas text-lg tracking-wider text-red-500">
        REGISTRATION DEADLINE: <span className="text-white">26 SEPT, 12:00 AM</span> — COMPLETE PAYMENT TO SECURE YOUR SPOT
      </span>
    </div>
  );
}
