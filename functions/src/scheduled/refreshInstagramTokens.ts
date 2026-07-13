import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION, db } from '../lib/admin';
import { refreshLongLivedToken } from '../lib/graphApi';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Instagram long-lived tokens last ~60 days. Running daily and refreshing
// anything within 7 days of expiry leaves comfortable margin for retries.
export const refreshInstagramTokens = onSchedule(
  { schedule: 'every day 03:00', timeZone: 'Europe/Istanbul', region: REGION },
  async () => {
    const soon = new Date(Date.now() + SEVEN_DAYS_MS);
    const snapshot = await db
      .collection('igAccounts')
      .where('status', '==', 'active')
      .where('tokenExpiresAt', '<=', soon)
      .get();

    for (const doc of snapshot.docs) {
      const secretRef = db.collection('igAccountsSecrets').doc(doc.id);
      const secretDoc = await secretRef.get();
      const accessToken = secretDoc.data()?.accessToken as string | undefined;
      if (!accessToken) continue;

      try {
        const refreshed = await refreshLongLivedToken(accessToken);
        const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
        await secretRef.set({ accessToken: refreshed.access_token, refreshNeededAt: expiresAt }, { merge: true });
        await doc.ref.update({ tokenExpiresAt: expiresAt, status: 'active' });
      } catch (err) {
        await doc.ref.update({ status: 'token_expired' });
      }
    }
  }
);
