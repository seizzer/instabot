import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, OAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebase';
import { ensureUserProfileExists } from './auth';
import { SupportedLanguage } from '../i18n';

let googleConfigured = false;

// Called once at app startup (see App.tsx). No-ops if the web client ID
// hasn't been filled in yet so the rest of the app keeps working without it.
export function configureGoogleSignIn() {
  if (googleConfigured) return;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    console.warn('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID missing — Google sign-in disabled');
    return;
  }
  GoogleSignin.configure({ webClientId });
  googleConfigured = true;
}

export function isGoogleSignInAvailable() {
  return googleConfigured;
}

export async function signInWithGoogle(locale: SupportedLanguage) {
  if (!googleConfigured) {
    throw new Error('Google ile giriş henüz yapılandırılmadı.');
  }
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (result.type !== 'success' || !result.data.idToken) {
    throw new Error('Google ile giriş tamamlanamadı.');
  }

  const credential = GoogleAuthProvider.credential(result.data.idToken);
  const userCredential = await signInWithCredential(auth, credential);
  await ensureUserProfileExists(
    userCredential.user.uid,
    userCredential.user.email,
    userCredential.user.displayName,
    locale
  );
  return userCredential.user;
}

export async function isAppleSignInAvailable() {
  return Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync());
}

export async function signInWithApple(locale: SupportedLanguage) {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!appleCredential.identityToken) {
    throw new Error('Apple ile giriş tamamlanamadı.');
  }

  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: appleCredential.identityToken,
    rawNonce,
  });

  const userCredential = await signInWithCredential(auth, credential);
  const displayName = appleCredential.fullName?.givenName
    ? `${appleCredential.fullName.givenName} ${appleCredential.fullName.familyName ?? ''}`.trim()
    : userCredential.user.displayName;

  await ensureUserProfileExists(userCredential.user.uid, userCredential.user.email, displayName, locale);
  return userCredential.user;
}
