import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { REGION, db } from '../lib/admin';
import { sendDirectMessage } from '../lib/graphApi';
import { getAccessToken, logMessage } from '../lib/dmFlowRuntime';
import { getEligibleRecipientsQuery } from '../lib/broadcastEligibility';

interface Request {
  igAccountId: string;
  text: string;
  targetTag: string | null;
}

const MAX_RECIPIENTS_PER_CALL = 100;

export const sendBroadcast = onCall<Request>({ region: REGION, timeoutSeconds: 300 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş yapmalısınız.');
  const { igAccountId, text, targetTag } = request.data;
  if (!igAccountId || !text?.trim()) {
    throw new HttpsError('invalid-argument', 'Eksik parametre.');
  }

  const igAccountSnap = await db.collection('igAccounts').doc(igAccountId).get();
  if (!igAccountSnap.exists || igAccountSnap.data()?.ownerUid !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Bu hesaba erişimin yok.');
  }
  const igUserId = igAccountSnap.data()!.igUserId as string;

  const accessToken = await getAccessToken(igAccountId);
  if (!accessToken) throw new HttpsError('failed-precondition', 'Erişim token bulunamadı.');

  const eligible = await getEligibleRecipientsQuery(igAccountId, targetTag)
    .limit(MAX_RECIPIENTS_PER_CALL)
    .get();

  const broadcastRef = await db.collection('broadcasts').add({
    ownerUid: request.auth.uid,
    igAccountId,
    text,
    targetTag: targetTag ?? null,
    status: 'sending',
    recipientCount: eligible.size,
    sentCount: 0,
    failedCount: 0,
    createdAt: new Date(),
  });

  let sentCount = 0;
  let failedCount = 0;
  for (const doc of eligible.docs) {
    const recipientUserId = doc.data().commenterIgId as string;
    try {
      await sendDirectMessage({ igUserId, accessToken, recipientUserId, text });
      await logMessage({ conversationId: doc.id, direction: 'outbound', text });
      sentCount++;
    } catch (err) {
      failedCount++;
    }
  }

  await broadcastRef.update({
    status: 'sent',
    sentCount,
    failedCount,
  });

  return { broadcastId: broadcastRef.id, recipientCount: eligible.size, sentCount, failedCount };
});
