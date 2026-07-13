import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { REGION, db } from '../lib/admin';
import { metaAppId, metaAppSecret } from '../lib/secrets';
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getInstagramBusinessAccountId,
  getInstagramUsername,
  listManagedPages,
  subscribePageWebhooks,
} from '../lib/graphApi';

interface Request {
  authorizationCode: string;
  redirectUri: string;
}

export const exchangeInstagramCode = onCall<Request>(
  { region: REGION, secrets: [metaAppId, metaAppSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş yapmalısınız.');
    const { authorizationCode, redirectUri } = request.data;

    const { access_token: shortLivedToken } = await exchangeCodeForToken({
      appId: metaAppId.value(),
      appSecret: metaAppSecret.value(),
      redirectUri,
      code: authorizationCode,
    });

    const { access_token: userLongLivedToken, expires_in } = await exchangeForLongLivedToken({
      appId: metaAppId.value(),
      appSecret: metaAppSecret.value(),
      shortLivedToken,
    });

    const pages = await listManagedPages(userLongLivedToken);

    let linkedPage: { id: string; access_token: string } | null = null;
    let igUserId: string | null = null;
    for (const page of pages) {
      const found = await getInstagramBusinessAccountId(page.id, page.access_token);
      if (found) {
        linkedPage = page;
        igUserId = found;
        break;
      }
    }

    if (!linkedPage || !igUserId) {
      throw new HttpsError(
        'failed-precondition',
        'Yönetebildiğin Facebook Sayfalarından hiçbiri bir Instagram Business/Creator hesabına bağlı değil.'
      );
    }

    const igUsername = await getInstagramUsername(igUserId, linkedPage.access_token);
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

    let webhookSubscribed = false;
    try {
      await subscribePageWebhooks(linkedPage.id, linkedPage.access_token);
      webhookSubscribed = true;
    } catch (err) {
      // Non-fatal: account still gets connected, user can retry from Settings.
    }

    // Reconnecting the same Instagram account (e.g. after token expiry) must
    // update the existing igAccounts doc rather than create a new one —
    // existing rules reference the doc id, and a duplicate would leave them
    // permanently pointed at the now-dead old doc.
    const existing = await db
      .collection('igAccounts')
      .where('ownerUid', '==', request.auth.uid)
      .where('igUserId', '==', igUserId)
      .limit(1)
      .get();
    const igAccountRef = existing.empty ? db.collection('igAccounts').doc() : existing.docs[0].ref;

    await igAccountRef.set(
      {
        ownerUid: request.auth.uid,
        igUserId,
        igUsername,
        fbPageId: linkedPage.id,
        status: 'active',
        tokenExpiresAt,
        webhookSubscribed,
        connectedAt: new Date(),
      },
      { merge: true }
    );

    // Page access tokens (not the user token) are used for all subsequent
    // Graph API calls — comments/messages permissions are granted per-Page.
    await db.collection('igAccountsSecrets').doc(igAccountRef.id).set({
      accessToken: linkedPage.access_token,
      refreshNeededAt: tokenExpiresAt,
    });

    return { igAccountId: igAccountRef.id, igUsername };
  }
);
