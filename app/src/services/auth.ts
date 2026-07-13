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

// Shared by email signup and Google/Apple sign-in — a social login can hit an
// existing uid (returning user) or a brand-new one (first time), so this only
// creates the profile doc if it isn't there yet rather than overwriting it.
export async function ensureUserProfileExists(
  uid: string,
  email: string | null,
  displayName: string | null,
  locale: 'tr' | 'en'
) {
  const ref = doc(db, 'users', uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return;
  await setDoc(ref, {
    email,
    displayName,
    locale,
    onboardingCompleted: false,
    notificationsEnabled: true,
    createdAt: serverTimestamp(),
  });
}

export async function signUpWithEmail(email: string, password: string, locale: 'tr' | 'en') {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await ensureUserProfileExists(credential.user.uid, email, null, locale);
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
    notificationsEnabled: data.notificationsEnabled ?? true,
    createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
  };
}

export async function markOnboardingCompleted(uid: string) {
  await setDoc(doc(db, 'users', uid), { onboardingCompleted: true }, { merge: true });
}

export async function setNotificationsEnabled(uid: string, enabled: boolean) {
  await setDoc(doc(db, 'users', uid), { notificationsEnabled: enabled }, { merge: true });
}

