import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../services/firebase';
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
  // Firebase's `user.reload()` mutates the SDK's User object in place — it
  // doesn't emit an onAuthStateChanged event, so React never re-renders on
  // its own. This forces one (e.g. after a "check email verification"
  // action) by re-pointing `user` at the (same, but freshly-read) instance.
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  subscription: null,
  initializing: true,
  refreshProfile: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [initializing, setInitializing] = useState(true);
  // Bumped by refreshUser() to force a re-render — `user.reload()` mutates
  // the existing User object in place (same reference), so reading
  // `user.emailVerified` again after this changes picks up the fresh value
  // without needing a new object reference.
  const [, setRefreshTick] = useState(0);

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

  const refreshUser = async () => {
    await auth.currentUser?.reload();
    setRefreshTick((t) => t + 1);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, subscription, initializing, refreshProfile, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
