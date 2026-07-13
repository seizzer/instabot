import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
// @ts-expect-error — getReactNativePersistence exists in firebase/auth's React
// Native build (resolved correctly by Metro at runtime) but is missing from
// its universal .d.ts facade, a known firebase-js-sdk typings gap.
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase web config values are not secret (they only identify the project),
// but we still keep them out of source control via EXPO_PUBLIC_* env vars.
// See app/.env.example for the required keys.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// initializeAuth throws if called twice (e.g. on Fast Refresh), fall back to getAuth.
let auth: Auth;
try {
  auth = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(firebaseApp);
}

export { auth };
export const db = getFirestore(firebaseApp);

// Cloud Functions run in europe-west3 — callable functions must target that region explicitly,
// see src/services/functions.ts.
export const FUNCTIONS_REGION = 'europe-west3';
