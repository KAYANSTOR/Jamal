import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { syncEngine } from '../lib/db';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const token = await currentUser.getIdToken();
        localStorage.setItem('auth_token', token);
        if (!localStorage.getItem('device_id')) {
          localStorage.setItem('device_id', `DEV-${Math.random().toString(36).substring(2, 9)}`);
        }
        // Start robust sync (periodic + auto reconnect + push then pull)
        syncEngine.start();
      } else {
        localStorage.removeItem('auth_token');
        syncEngine.stop();
      }
      setLoading(false);
    });
    return () => {
      unsubscribe();
      syncEngine.stop();
    };
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error('Error signing in', error);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      syncEngine.stop();
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
