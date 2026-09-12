import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type EventState = 
  | 'DRAFT'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'TEAM_FORMATION'
  | 'TEAM_LOCKED'
  | 'PRE_EVENT'
  | 'CHECK_IN'
  | 'OPENING_CEREMONY'
  | 'HACKATHON_RUNNING'
  | 'MENTORING'
  | 'SUBMISSION_OPEN'
  | 'SUBMISSION_CLOSED'
  | 'JUDGING'
  | 'WINNER_FINALIZATION'
  | 'CERTIFICATES_AVAILABLE'
  | 'EVENT_CLOSED'
  | 'ARCHIVED';

export interface FeatureFlags {
  registration: boolean;
  teamCreation: boolean;
  qrEntry: boolean;
  mealDistribution: boolean;
  announcements: boolean;
  projectSubmission: boolean;
  certificates: boolean;
  sponsorApis: boolean;
  cloudCredits: boolean;
  volunteerMode: boolean;
  liveEventMode: boolean;
}

export interface EventConfig {
  eventName: string;
  edition: string;
  venue: string;
  timezone: string;
  currentState: EventState;
  maintenanceMode: boolean;
  emergencyMode: boolean;
  featureFlags: FeatureFlags;
  milestones: {
    registrationStart: string;
    registrationEnd: string;
    submissionDeadline: string;
    hackathonStart: string;
    hackathonEnd: string;
  };
}

interface EventContextType {
  config: EventConfig | null;
  loading: boolean;
  timeRemaining: string | null;
  canRegister: () => boolean;
  canCreateTeam: () => boolean;
  canModifyTeam: () => boolean;
  canSubmitProject: () => boolean;
  canDownloadCertificate: () => boolean;
}

const defaultFlags: FeatureFlags = {
  registration: false,
  teamCreation: false,
  qrEntry: false,
  mealDistribution: false,
  announcements: true,
  projectSubmission: false,
  certificates: false,
  sponsorApis: false,
  cloudCredits: false,
  volunteerMode: true,
  liveEventMode: false
};

const EventContext = createContext<EventContextType>({
  config: null,
  loading: true,
  timeRemaining: null,
  canRegister: () => false,
  canCreateTeam: () => false,
  canModifyTeam: () => false,
  canSubmitProject: () => false,
  canDownloadCertificate: () => false
});

// eslint-disable-next-line react-refresh/only-export-components
export const useEventEngine = () => useContext(EventContext);

export const EventProvider = ({ children }: { children: React.ReactNode }) => {
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    // Listen to a central document: /system/eventConfig
    const unsub = onSnapshot(doc(db, 'system', 'eventConfig'), (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data() as EventConfig);
      } else {
        // Fallback for development if document is missing
        setConfig({
          eventName: 'GLITCH',
          edition: '36 2.0',
          venue: 'Main Campus Arena',
          timezone: 'Asia/Kolkata',
          currentState: 'REGISTRATION_OPEN',
          maintenanceMode: false,
          emergencyMode: false,
          featureFlags: defaultFlags,
          milestones: {
            registrationStart: new Date().toISOString(),
            registrationEnd: new Date(Date.now() + 86400000 * 7).toISOString(),
            submissionDeadline: new Date(Date.now() + 86400000 * 14).toISOString(),
            hackathonStart: new Date(Date.now() + 86400000 * 10).toISOString(),
            hackathonEnd: new Date(Date.now() + 86400000 * 12).toISOString(),
          }
        });
      }
      setLoading(false);
    }, (error) => {
      console.error("Error loading event config:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Countdown timer logic based on milestones
  useEffect(() => {
    if (!config) return;
    
    const calculateTimeLeft = () => {
      let targetTime: Date | null = null;
      
      switch (config.currentState) {
        case 'REGISTRATION_OPEN':
        case 'TEAM_FORMATION':
          targetTime = new Date(config.milestones.registrationEnd);
          break;
        case 'SUBMISSION_OPEN':
        case 'HACKATHON_RUNNING':
          targetTime = new Date(config.milestones.submissionDeadline);
          break;
        case 'PRE_EVENT':
          targetTime = new Date(config.milestones.hackathonStart);
          break;
        default:
          targetTime = null;
      }

      if (targetTime) {
        const difference = targetTime.getTime() - new Date().getTime();
        if (difference > 0) {
          const d = Math.floor(difference / (1000 * 60 * 60 * 24));
          const h = Math.floor((difference / (1000 * 60 * 60)) % 24);
          const m = Math.floor((difference / 1000 / 60) % 60);
          const s = Math.floor((difference / 1000) % 60);
          setTimeRemaining(`${d}d ${h}h ${m}m ${s}s`);
        } else {
          setTimeRemaining("TIME'S UP");
        }
      } else {
        setTimeRemaining(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [config]);

  // Feature Gating Helpers
  const canRegister = () => {
    if (!config) return false;
    if (config.maintenanceMode || config.emergencyMode) return false;
    return config.currentState === 'REGISTRATION_OPEN' && config.featureFlags.registration;
  };

  const canCreateTeam = () => {
    if (!config) return false;
    if (config.emergencyMode) return false;
    const validStates = ['REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'TEAM_FORMATION'];
    return validStates.includes(config.currentState) && config.featureFlags.teamCreation;
  };

  const canModifyTeam = () => {
    if (!config) return false;
    if (config.emergencyMode) return false;
    const lockedStates = ['TEAM_LOCKED', 'PRE_EVENT', 'CHECK_IN', 'OPENING_CEREMONY', 'HACKATHON_RUNNING', 'MENTORING', 'SUBMISSION_OPEN', 'SUBMISSION_CLOSED', 'JUDGING', 'WINNER_FINALIZATION', 'CERTIFICATES_AVAILABLE', 'EVENT_CLOSED', 'ARCHIVED'];
    return !lockedStates.includes(config.currentState);
  };

  const canSubmitProject = () => {
    if (!config) return false;
    if (config.emergencyMode) return false;
    return config.currentState === 'SUBMISSION_OPEN' && config.featureFlags.projectSubmission;
  };

  const canDownloadCertificate = () => {
    if (!config) return false;
    return config.currentState === 'CERTIFICATES_AVAILABLE' && config.featureFlags.certificates;
  };

  return (
    <EventContext.Provider value={{
      config,
      loading,
      timeRemaining,
      canRegister,
      canCreateTeam,
      canModifyTeam,
      canSubmitProject,
      canDownloadCertificate
    }}>
      {children}
    </EventContext.Provider>
  );
};
