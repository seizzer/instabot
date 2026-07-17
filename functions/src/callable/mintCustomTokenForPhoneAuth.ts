import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { REGION } from '../lib/admin';

interface MintCustomTokenForPhoneAuthRequest {
  idToken: string;
}
interface MintCustomTokenForPhoneAuthResponse {
  customToken: string;
}

// No request.auth here by design — the client hasn't signed into the JS SDK
// yet at this point (that's the whole bridge this function exists for). The
// idToken comes from a separate native Firebase Auth instance
// (@react-native-firebase/auth) used only to verify the phone number.
export const mintCustomTokenForPhoneAuth = onCall<MintCustomTokenForPhoneAuthRequest>(
  { region: REGION },
  async (request): Promise<MintCustomTokenForPhoneAuthResponse> => {
    const { idToken } = request.data;
    if (!idToken) throw new HttpsError('invalid-argument', 'idToken gerekli.');

    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
    } catch {
      throw new HttpsError('unauthenticated', 'Geçersiz oturum.');
    }

    // Defense in depth, not a security boundary (verifyIdToken already fully
    // authenticates) — keeps this bridge scoped to its one intended caller so
    // it can't quietly become a generic "clone any session" endpoint later.
    if (decoded.firebase.sign_in_provider !== 'phone') {
      throw new HttpsError('permission-denied', 'Bu uç nokta sadece telefon girişi için.');
    }

    const customToken = await getAuth().createCustomToken(decoded.uid);
    return { customToken };
  }
);
