import fetch from 'node-fetch';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { REGION, db } from '../lib/admin';
import { geminiProxySharedSecret, geminiProxyUrl } from '../lib/secrets';

interface Request {
  commentText: string;
  tone: 'samimi' | 'resmi';
}

// AI mode is Pro-only. The actual Gemini call always goes through the Vercel
// proxy (see /vercel-gemini-proxy) so the Gemini API key never lives in two
// places — this function and the mobile app's live automation both call it.
export const previewAiReply = onCall<Request>(
  { region: REGION, secrets: [geminiProxyUrl, geminiProxySharedSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş yapmalısınız.');

    const subscriptionDoc = await db.collection('subscriptions').doc(request.auth.uid).get();
    const entitlementActive = subscriptionDoc.data()?.entitlementActive === true;
    if (!entitlementActive) {
      throw new HttpsError('permission-denied', 'AI modu Pro abonelik gerektirir.');
    }

    const response = await fetch(`${geminiProxyUrl.value()}/api/classify-and-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-proxy-secret': geminiProxySharedSecret.value(),
      },
      body: JSON.stringify({ commentText: request.data.commentText, tone: request.data.tone }),
    });

    if (!response.ok) {
      throw new HttpsError('internal', 'AI önerisi alınamadı, lütfen tekrar dene.');
    }

    const result = (await response.json()) as { intent: string; suggestedReply: string };
    return result;
  }
);
