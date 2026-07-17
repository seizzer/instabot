import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { LoginManager } from 'react-native-fbsdk-next';
import rnfirebaseAuth from '@react-native-firebase/auth';
import { auth, db } from './firebase';
import { UserProfile } from '../types/models';

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Shared by email signup and Google/Apple/Facebook/phone sign-in — a social
// login can hit an existing uid (returning user) or a brand-new one (first
// time), so this only creates the profile doc if it isn't there yet rather
// than overwriting it.
export async function ensureUserProfileExists(
  uid: string,
  email: string | null,
  phoneNumber: string | null,
  displayName: string | null,
  locale: 'tr' | 'en'
) {
  const ref = doc(db, 'users', uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return;
  await setDoc(ref, {
    email,
    phoneNumber,
    displayName,
    locale,
    onboardingCompleted: false,
    notificationsEnabled: true,
    createdAt: serverTimestamp(),
  });
}

export async function signUpWithEmail(email: string, password: string, locale: 'tr' | 'en') {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await ensureUserProfileExists(credential.user.uid, email, null, null, locale);
  await sendEmailVerification(credential.user);
  return credential.user;
}

export async function resendVerificationEmail() {
  if (!auth.currentUser) return;
  await sendEmailVerification(auth.currentUser);
}

export async function updateDisplayName(uid: string, displayName: string) {
  if (!auth.currentUser) throw new Error('Oturum bulunamadı.');
  await updateProfile(auth.currentUser, { displayName });
  await setDoc(doc(db, 'users', uid), { displayName }, { merge: true });
}

export async function changePassword(email: string, currentPassword: string, newPassword: string) {
  if (!auth.currentUser) throw new Error('Oturum bulunamadı.');
  const credential = EmailAuthProvider.credential(email, currentPassword);
  await reauthenticateWithCredential(auth.currentUser, credential);
  await updatePassword(auth.currentUser, newPassword);
}

export async function logInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logOut() {
  await signOut(auth);
  // Defensive cleanup for the other two native sign-in stacks — both are
  // no-ops when there's no active session, but a stray Facebook session or
  // an interrupted phone-auth bridge (see phoneAuth.ts) would otherwise
  // silently re-authenticate the next time those SDKs are touched.
  await LoginManager.logOut();
  await rnfirebaseAuth().signOut().catch(() => undefined);
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    uid,
    email: data.email ?? null,
    phoneNumber: data.phoneNumber ?? null,
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

