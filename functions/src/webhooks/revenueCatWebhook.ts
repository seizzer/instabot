import { onRequest } from 'firebase-functions/v2/https';
import { REGION, db } from '../lib/admin';
import { revenueCatWebhookSecret } from '../lib/secrets';

const ACTIVE_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
]);
const INACTIVE_EVENT_TYPES = new Set(['CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE']);

// Configured as an "Authorization: Bearer <secret>" header in the RevenueCat
// dashboard (Project settings > Webhooks) — see META_SETUP.md / CLAUDE.md.
export const revenueCatWebhook = onRequest(
  { region: REGION, secrets: [revenueCatWebhookSecret] },
  async (req, res) => {
    const authHeader = req.get('Authorization');
    if (authHeader !== `Bearer ${revenueCatWebhookSecret.value()}`) {
      res.status(401).send('Unauthorized');
      return;
    }

    const event = req.body?.event;
    const uid = event?.app_user_id;
    if (!uid) {
      res.status(200).send('ignored');
      return;
    }

    const isActive = ACTIVE_EVENT_TYPES.has(event.type);
    const isInactive = INACTIVE_EVENT_TYPES.has(event.type);

    if (isActive || isInactive) {
      await db.collection('subscriptions').doc(uid).set(
        {
          tier: isActive ? 'pro' : 'free',
          entitlementActive: isActive,
          revenueCatCustomerId: event.app_user_id,
          expiresAt: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }

    res.status(200).send('OK');
  }
);
