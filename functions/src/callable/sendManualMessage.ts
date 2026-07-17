import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { REGION, db } from '../lib/admin';
import { sendDirectMessage } from '../lib/graphApi';
import { getAccessToken, logMessage } from '../lib/dmFlowRuntime';

interface Request {
  igAccountId: string;
  recipientUserId: string;
  text: string;
}

// Lets the account owner take over a conversation and type a real reply —
// the "manual inbox" ManyChat calls Live Chat. Subject to the same Meta
// messaging-window rules as automated replies (Graph API rejects it
// otherwise, surfaced to the caller as-is).
export const sendManualMessage = onCall<Request>({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş yapmalısınız.');
  const { igAccountId, recipientUserId, text } = request.data;
  if (!igAccountId || !recipientUserId || !text?.trim()) {
    throw new HttpsError('invalid-argument', 'Eksik parametre.');
  }

  const igAccountSnap = await db.collection('igAccounts').doc(igAccountId).get();
  if (!igAccountSnap.exists || igAccountSnap.data()?.ownerUid !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Bu hesaba erişimin yok.');
  }
  const igUserId = igAccountSnap.data()!.igUserId as string;

  const accessToken = await getAccessToken(igAccountId);
  if (!accessToken) throw new HttpsError('failed-precondition', 'Erişim token bulunamadı.');

  await sendDirectMessage({ igUserId, accessToken, recipientUserId, text });

  const conversationId = `${igAccountId}_${recipientUserId}`;
  await logMessage({ conversationId, direction: 'outbound', text });
  await db
    .collection('conversations')
    .doc(conversationId)
    .set({ lastInteractionAt: new Date() }, { merge: true });

  return { success: true };
});
