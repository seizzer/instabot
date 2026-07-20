import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { REGION } from '../lib/admin';
import { metaAppId, metaAppSecret } from '../lib/secrets';
import {
  exchangeEmbeddedSignupCode,
  getWhatsAppPhoneNumberInfo,
  subscribeWhatsAppWebhooks,
} from '../lib/graphApi';
import { upsertWhatsAppAccount } from '../lib/whatsAppAccountStorage';

interface Request {
  code: string;
  wabaId: string;
  phoneNumberId: string;
}

// The real, end-user-facing connection path (see ConnectWhatsAppScreen's
// WebView) — the customer never sees an ID or a token, they just tap
// "Connect WhatsApp" and log in. connectWhatsAppAccount (manual System User
// token paste) stays as the quick dev/testing path.
export const exchangeWhatsAppEmbeddedSignupCode = onCall<Request>(
  { region: REGION, secrets: [metaAppId, metaAppSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş yapmalısınız.');
    const { code, wabaId, phoneNumberId } = request.data;
    if (!code || !wabaId || !phoneNumberId) {
      throw new HttpsError('invalid-argument', 'Eksik parametre.');
    }

    const { access_token: accessToken } = await exchangeEmbeddedSignupCode({
      appId: metaAppId.value(),
      appSecret: metaAppSecret.value(),
      code,
    });

    const info = await getWhatsAppPhoneNumberInfo(phoneNumberId, accessToken);

    let webhookSubscribed = false;
    try {
      await subscribeWhatsAppWebhooks(wabaId, accessToken);
      webhookSubscribed = true;
    } catch (err) {
      // Non-fatal, same as exchangeInstagramCode's Page webhook subscribe —
      // account still connects, can be retried later.
    }

    const whatsAppAccountId = await upsertWhatsAppAccount({
      ownerUid: request.auth.uid,
      phoneNumberId,
      wabaId,
      displayPhoneNumber: info.display_phone_number,
      verifiedName: info.verified_name,
      accessToken,
    });

    return { whatsAppAccountId, displayPhoneNumber: info.display_phone_number, webhookSubscribed };
  }
);
