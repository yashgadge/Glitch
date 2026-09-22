import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { EventConfigService } from '@shared/services/EventConfigService';
import { ParticipantService } from '@shared/services/ParticipantService';
import { TeamService } from '@shared/services/TeamService';
import { useAuth } from '@shared/contexts/AuthContext';
import type { EventConfig, Participant, Team } from '@shared/types/models';

export default function RegistrationDeadlineBanner() {
  const { user } = useAuth();
  const [eventConfig, setEventConfig] = useState<EventConfig | null>(null);
  const [profile, setProfile] = useState<Participant | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubConfig = EventConfigService.subscribeToConfig((config) => {
      setEventConfig(config);
    });

    if (user) {
      const unsubProfile = ParticipantService.subscribeToParticipant(user.uid, (data) => {
        setProfile(data);
        if (!data?.teamId) {
          setTeam(null);
          setLoading(false);
        }
      });
      return () => {
        unsubConfig();
        unsubProfile();
      };
    }
    
    setLoading(false);
    return () => unsubConfig();
  }, [user]);

  useEffect(() => {
    if (profile?.teamId) {
      const unsubTeam = TeamService.subscribeToTeam(profile.teamId, (data) => {
        setTeam(data);
        setLoading(false);
      });
      return () => unsubTeam();
    }
  }, [profile?.teamId]);

  if (loading) return null;

  const deadline = eventConfig?.registrationDeadline;
  if (!deadline) return null;

  // Rules to show banner:
  // 1. No team
  // 2. Or Team has no track
  // 3. Or Team payment is not paid
  const isTeamFullyRegistered = team && team.track && team.paymentStatus?.toLowerCase() === 'paid';
  const showBanner = !isTeamFullyRegistered;

  if (!showBanner) return null;

  const dateObj = new Date(deadline);
  // Format: "10 OCT, 12:00 AM"
  const formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase() + 
    ', ' + dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="mb-6 bg-red-950/40 border border-red-500/30 rounded-lg p-3 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(227,6,19,0.15)] text-center">
      <Clock className="w-4 h-4 text-red-500" />
      <span className="font-bebas text-lg tracking-wider text-red-500">
        REGISTRATION DEADLINE: <span className="text-white">{formattedDate}</span> — COMPLETE PAYMENT TO SECURE YOUR SPOT
      </span>
    </div>
  );
}
