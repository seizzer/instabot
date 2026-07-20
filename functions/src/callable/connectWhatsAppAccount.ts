import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { REGION, db } from '../lib/admin';
import { getWhatsAppPhoneNumberInfo } from '../lib/graphApi';

interface Request {
  phoneNumberId: string;
  wabaId: string;
  // A permanent System User access token from Meta Business Manager (WhatsApp
  // Cloud API has no OAuth redirect flow like Instagram/Messenger — this is
  // the standard self-serve connection method for a single-user tool).
  accessToken: string;
}

export const connectWhatsAppAccount = onCall<Request>({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş yapmalısınız.');
  const { phoneNumberId, wabaId, accessToken } = request.data;
  if (!phoneNumberId || !wabaId || !accessToken) {
    throw new HttpsError('invalid-argument', 'Eksik parametre.');
  }

  let info: { display_phone_number: string; verified_name: string };
  try {
    info = await getWhatsAppPhoneNumberInfo(phoneNumberId, accessToken);
  } catch (err: any) {
    throw new HttpsError(
      'failed-precondition',
      'Telefon numarası/token doğrulanamadı: ' + (err?.message ?? 'bilinmeyen hata')
    );
  }

  // Reconnecting the same number (e.g. after rotating the token) updates the
  // existing doc rather than creating a new one — same reasoning as
  // exchangeInstagramCode's igAccounts upsert.
  const existing = await db
    .collection('whatsAppAccounts')
    .where('ownerUid', '==', request.auth.uid)
    .where('phoneNumberId', '==', phoneNumberId)
    .limit(1)
    .get();
  const accountRef = existing.empty ? db.collection('whatsAppAccounts').doc() : existing.docs[0].ref;

  await accountRef.set(
    {
      ownerUid: request.auth.uid,
      phoneNumberId,
      wabaId,
      displayPhoneNumber: info.display_phone_number,
      verifiedName: info.verified_name,
      status: 'active',
      connectedAt: new Date(),
    },
    { merge: true }
  );

  await db.collection('whatsAppAccountsSecrets').doc(accountRef.id).set({ accessToken });

  return { whatsAppAccountId: accountRef.id, displayPhoneNumber: info.display_phone_number };
});
