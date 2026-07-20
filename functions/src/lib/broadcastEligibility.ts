import { db } from './admin';

// Messenger Platform's standard messaging window is 24 hours from the
// recipient's last interaction — broadcasting outside it is exactly the
// "cold DM" behavior Meta's policy (and CLAUDE.md's architecture rules)
// forbid, so this is a hard filter, not a suggestion. Shared by sendBroadcast
// (actually sends) and getBroadcastRecipientCount (preview only).
const MESSAGING_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getEligibleRecipientsQuery(igAccountId: string, targetTag: string | null) {
  const windowStart = new Date(Date.now() - MESSAGING_WINDOW_MS);
  let query = db
    .collection('conversations')
    .where('igAccountId', '==', igAccountId)
    .where('lastInteractionAt', '>=', windowStart);
  if (targetTag) {
    query = query.where('tags', 'array-contains', targetTag) as typeof query;
  }
  return query;
}
