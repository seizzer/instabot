import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { REGION, db } from '../lib/admin';
import { getEligibleRecipientsQuery } from '../lib/broadcastEligibility';

interface Request {
  igAccountId: string;
  targetTag: string | null;
}

// Preview-only — returns a count, never the recipient list itself, so the
// client can show "will reach N people" before sending without exposing who
// those people are.
export const getBroadcastRecipientCount = onCall<Request>({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş yapmalısınız.');
  const { igAccountId, targetTag } = request.data;
  if (!igAccountId) throw new HttpsError('invalid-argument', 'Eksik parametre.');

  const igAccountSnap = await db.collection('igAccounts').doc(igAccountId).get();
  if (!igAccountSnap.exists || igAccountSnap.data()?.ownerUid !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Bu hesaba erişimin yok.');
  }

  const countSnap = await getEligibleRecipientsQuery(igAccountId, targetTag).count().get();
  return { count: countSnap.data().count };
});
