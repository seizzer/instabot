import rnfirebaseAuth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from './firebase';
import { ensureUserProfileExists } from './auth';
import { mintCustomTokenForPhoneAuth } from './functions';
import { SupportedLanguage } from '../i18n';

// Held at module scope, not in navigation state — ConfirmationResult isn't
// serializable and only ever needs to survive the phone->OTP screen hop.
let pendingConfirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

export async function sendPhoneOtp(e164PhoneNumber: string) {
  pendingConfirmation = await rnfirebaseAuth().signInWithPhoneNumber(e164PhoneNumber);
}

// RNFirebase's phone-verified user is only ever used to mint a custom token
// for the JS SDK's session — it is signed out immediately after, so it never
// becomes a second persisted session alongside the JS SDK's (see auth.ts's
// logOut for the matching defensive cleanup).
export async function confirmPhoneOtp(code: string, locale: SupportedLanguage) {
  if (!pendingConfirmation) {
    throw new Error('Önce kod isteği göndermelisiniz.');
  }

  const rnCredential = await pendingConfirmation.confirm(code);
  if (!rnCredential?.user) {
    throw new Error('Kod doğrulanamadı.');
  }

  const idToken = await rnCredential.user.getIdToken();
  const { data } = await mintCustomTokenForPhoneAuth({ idToken });

  const userCredential = await signInWithCustomToken(auth, data.customToken);
  await rnfirebaseAuth().signOut();
  pendingConfirmation = null;

  await ensureUserProfileExists(
    userCredential.user.uid,
    userCredential.user.email,
    userCredential.user.phoneNumber,
    userCredential.user.displayName,
    locale
  );
  return userCredential.user;
}
