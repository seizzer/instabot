import * as crypto from 'crypto';
import { onRequest } from 'firebase-functions/v2/https';
import { db, REGION } from '../lib/admin';
import { metaAppSecret, metaWebhookVerifyToken } from '../lib/secrets';

function isValidSignature(rawBody: Buffer, signatureHeader: string | undefined, appSecret: string) {
  if (!signatureHeader) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Single endpoint handling both the Meta webhook verification handshake (GET)
// and incoming event delivery (POST). Meta requires a 200 response within
// ~5 seconds, so this function only validates + persists the raw event; the
// actual comment matching / DM sending happens in processWebhookEvent,
// triggered asynchronously by the Firestore write below.
export const instagramWebhook = onRequest(
  { region: REGION, secrets: [metaWebhookVerifyToken, metaAppSecret] },
  async (req, res) => {
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      if (mode === 'subscribe' && token === metaWebhookVerifyToken.value()) {
        res.status(200).send(challenge);
      } else {
        res.status(403).send('Forbidden');
      }
      return;
    }

    if (req.method === 'POST') {
      const signature = req.get('X-Hub-Signature-256');
      if (!isValidSignature(req.rawBody, signature, metaAppSecret.value())) {
        res.status(403).send('Invalid signature');
        return;
      }

      // Ack immediately, process asynchronously.
      res.status(200).send('EVENT_RECEIVED');

      await db.collection('webhookEvents').add({
        rawPayload: req.body,
        processed: false,
        receivedAt: new Date(),
      });
      return;
    }

    res.status(405).send('Method Not Allowed');
  }
);
