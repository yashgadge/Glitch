import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type UserRole = 'super_admin' | 'organizer' | 'judge' | 'mentor' | 'volunteer' | 'participant' | null;

// eslint-disable-next-line react-refresh/only-export-components
export const getRoleDashboard = (role: UserRole): string => {
  switch(role) {
    case 'super_admin': return '/admin';
    case 'organizer': return '/organizer';
    case 'judge': return '/judge';
    case 'volunteer': return '/volunteer';
    case 'mentor': return '/mentor';
    case 'participant': return '/dashboard';
    default: return '/dashboard';
  }
};

interface AuthContextType {
  user: User | null;
  role: UserRole; // Alias to activeRole for backward compatibility
  activeRole: UserRole;
  profileData: any;
  availableRoles: NonNullable<UserRole>[];
  mustChangePassword?: boolean;
  customPermissions: string[];
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfileStatus: () => Promise<void>;
  switchActiveRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  activeRole: null,
  profileData: null,
  availableRoles: [],
  mustChangePassword: false,
  customPermissions: [],
  loading: true,
  logout: async () => {},
  refreshProfileStatus: async () => {},
  switchActiveRole: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [availableRoles, setAvailableRoles] = useState<NonNullable<UserRole>[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (firebaseUser: User) => {
    try {
      // Check staff collection first
      const staffDoc = await getDoc(doc(db, 'staff', firebaseUser.uid));
      if (staffDoc.exists()) {
        const data = staffDoc.data();
        const extractedRoles = data.roles || (data.role ? [data.role] : []);
        setAvailableRoles(extractedRoles as NonNullable<UserRole>[]);
        
        // Auto-select if only one role available
        if (extractedRoles.length === 1) {
          setActiveRole(extractedRoles[0] as UserRole);
        } else {
          setActiveRole(null); // Requires user to select from Workspace Selector
        }

        setProfileData(data);
        setMustChangePassword(data.mustChangePassword || false);
        setCustomPermissions(data.customPermissions || []);
        return;
      }
      
      // If not staff, check participants collection
      const participantDoc = await getDoc(doc(db, 'participants', firebaseUser.uid));
      if (participantDoc.exists()) {
        const data = participantDoc.data();
        
        // Handle gracefully if a staff account was misplaced in the participants collection
        if (data.isStaff) {
          const extractedRoles = data.roles || (data.role ? [data.role] : []);
          setAvailableRoles(extractedRoles as NonNullable<UserRole>[]);
          
          if (extractedRoles.length === 1) {
            setActiveRole(extractedRoles[0] as UserRole);
          } else {
            setActiveRole(null);
          }

          setProfileData(data);
          setMustChangePassword(data.mustChangePassword || false);
          setCustomPermissions(data.customPermissions || []);
          return;
        }

        setAvailableRoles(['participant']);
        setActiveRole('participant'); // Hardcoded because participants can only be participants
        setProfileData(data);
        setMustChangePassword(data.mustChangePassword || false);
        setCustomPermissions([]);
        return;
      }
      
      // Fallback
      setActiveRole(null);
      setAvailableRoles([]);
      setMustChangePassword(false);
      setCustomPermissions([]);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setActiveRole(null);
      setAvailableRoles([]);
      setMustChangePassword(false);
      setCustomPermissions([]);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        setUser(firebaseUser);
        await fetchUserData(firebaseUser);
      } else {
        setUser(null);
        setActiveRole(null);
        setProfileData(null);
        setAvailableRoles([]);
        setMustChangePassword(false);
        setCustomPermissions([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfileStatus = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const switchActiveRole = (newRole: UserRole) => {
    setActiveRole(newRole);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      role: activeRole, 
      activeRole, 
      profileData,
      availableRoles, 
      switchActiveRole, 
      mustChangePassword, 
      customPermissions, 
      loading, 
      logout, 
      refreshProfileStatus 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
