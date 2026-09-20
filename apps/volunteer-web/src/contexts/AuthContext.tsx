import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export type UserRole = 'super_admin' | 'organizer' | 'judge' | 'mentor' | 'volunteer' | 'participant' | null;

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (firebaseUser: User) => {
    try {
      const staffDoc = await getDoc(doc(db, 'staff', firebaseUser.uid));
      if (staffDoc.exists()) {
        const data = staffDoc.data();
        const extractedRoles = data.roles || (data.role ? [data.role] : []);
        
        // For the Volunteer App, we verify if they have volunteer or higher access
        if (extractedRoles.includes('volunteer') || extractedRoles.includes('super_admin') || extractedRoles.includes('admin') || extractedRoles.includes('organizer')) {
          setRole('volunteer'); // For the context of this app, they are acting as a volunteer
        } else {
          setRole(null);
        }
        return;
      }
      setRole(null);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setRole(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchUserData(firebaseUser);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
