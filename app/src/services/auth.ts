import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from '../types/models';

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signUpWithEmail(email: string, password: string, locale: 'tr' | 'en') {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', credential.user.uid), {
    email,
    displayName: null,
    locale,
    onboardingCompleted: false,
    createdAt: serverTimestamp(),
  });
  return credential.user;
}

export async function logInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logOut() {
  await signOut(auth);
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    uid,
    email: data.email ?? null,
    displayName: data.displayName ?? null,
    locale: data.locale ?? 'tr',
    onboardingCompleted: !!data.onboardingCompleted,
    createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
  };
}

export async function markOnboardingCompleted(uid: string) {
  await setDoc(doc(db, 'users', uid), { onboardingCompleted: true }, { merge: true });
}

// Google/Apple sign-in require native config (expo-auth-session + Google/Apple
// developer credentials) that can only be finalized once the Meta/Firebase
// dashboards are set up. Wire these up following:
// https://docs.expo.dev/guides/authentication/#google, #apple-authentication
export async function signInWithGoogle(): Promise<User> {
  throw new Error('Google sign-in not configured yet — see src/services/auth.ts');
}
export async function signInWithApple(): Promise<User> {
  throw new Error('Apple sign-in not configured yet — see src/services/auth.ts');
}
