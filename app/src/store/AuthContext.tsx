import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuthState, fetchUserProfile } from '../services/auth';
import { subscribeToSubscription } from '../services/firestore';
import { configureRevenueCat } from '../services/revenuecat';
import { UserProfile, Subscription } from '../types/models';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  subscription: Subscription | null;
  initializing: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  subscription: null,
  initializing: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [initializing, setInitializing] = useState(true);

  const loadProfile = async (uid: string) => {
    const loaded = await fetchUserProfile(uid);
    setProfile(loaded);
  };

  useEffect(() => {
    const unsubscribeAuth = subscribeToAuthState(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        configureRevenueCat(firebaseUser.uid);
        await loadProfile(firebaseUser.uid);
      } else {
        setProfile(null);
        setSubscription(null);
      }
      setInitializing(false);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!user) return;
    return subscribeToSubscription(user.uid, setSubscription);
  }, [user]);

  const refreshProfile = async () => {
    if (user) await loadProfile(user.uid);
  };

  return (
    <AuthContext.Provider value={{ user, profile, subscription, initializing, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
