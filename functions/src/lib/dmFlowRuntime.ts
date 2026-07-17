import { FieldValue } from 'firebase-admin/firestore';
import { db } from './admin';
import { findMatchingKeyword } from './textMatch';
import { sendDirectMessage } from './graphApi';
import { DmFlowNode, IgAccount, Rule } from './types';

export async function getIgAccountByIgUserId(igUserId: string): Promise<IgAccount | null> {
  const snapshot = await db
    .collection('igAccounts')
    .where('igUserId', '==', igUserId)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as IgAccount;
}

export async function getAccessToken(igAccountId: string): Promise<string | null> {
  const doc = await db.collection('igAccountsSecrets').doc(igAccountId).get();
  return (doc.data()?.accessToken as string) ?? null;
}

export async function getActiveRulesForAccount(igAccountId: string): Promise<Rule[]> {
  const snapshot = await db
    .collection('rules')
    .where('igAccountId', '==', igAccountId)
    .where('status', '==', 'active')
    .orderBy('priority', 'asc')
    .get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Rule));
}

export function findRuleForComment(rules: Rule[], mediaId: string, commentText: string) {
  for (const rule of rules) {
    if (rule.targetScope === 'specific_posts' && !rule.targetPostIds.includes(mediaId)) {
      continue;
    }
    const matchedKeyword = findMatchingKeyword(commentText, rule.keywords);
    if (matchedKeyword) return { rule, matchedKeyword };
  }
  return null;
}

function fillTemplate(text: string, username: string): string {
  return text.replace(/\{\{\s*(username|kullanici_adi)\s*\}\}/gi, username);
}

interface SendNodeParams {
  igUserId: string;
  accessToken: string;
  node: DmFlowNode;
  username: string;
  recipientCommentId?: string;
  recipientUserId?: string;
  // When known, logs the outbound text to the conversation's transcript —
  // omitted for the very first message of a comment-triggered flow, where
  // the conversation doc doesn't exist yet at send time.
  conversationId?: string;
}

export async function sendFlowNode(params: SendNodeParams) {
  const text = fillTemplate(params.node.text, params.username);
  await sendDirectMessage({
    igUserId: params.igUserId,
    accessToken: params.accessToken,
    recipientCommentId: params.recipientCommentId,
    recipientUserId: params.recipientUserId,
    text,
    buttons: params.node.buttons,
    mediaUrl: params.node.type === 'file' ? params.node.mediaUrl : null,
  });
  if (params.conversationId) {
    await logMessage({ conversationId: params.conversationId, direction: 'outbound', text });
  }
}

export async function upsertConversation(params: {
  igAccountId: string;
  ownerUid: string;
  ruleId: string;
  commenterIgId: string;
  commenterUsername: string;
  currentNodeId: string;
  status: 'active' | 'completed';
}) {
  const conversationId = `${params.igAccountId}_${params.commenterIgId}`;
  await db
    .collection('conversations')
    .doc(conversationId)
    .set(
      {
        ownerUid: params.ownerUid,
        igAccountId: params.igAccountId,
        ruleId: params.ruleId,
        commenterIgId: params.commenterIgId,
        commenterUsername: params.commenterUsername,
        currentNodeId: params.currentNodeId,
        status: params.status,
        lastInteractionAt: new Date(),
      },
      { merge: true }
    );
  return conversationId;
}

// Message transcript storage — separate from `conversations` (which only
// tracks automation flow position) and `automationLogs` (which only tracks
// triggered rule events). Powers the manual inbox: real message history,
// including plain-text messages that never triggered a rule.
export async function logMessage(params: {
  conversationId: string;
  direction: 'inbound' | 'outbound';
  text: string;
}) {
  await db
    .collection('conversations')
    .doc(params.conversationId)
    .collection('messages')
    .add({
      direction: params.direction,
      text: params.text,
      createdAt: new Date(),
    });
}

// Ensures a conversation doc exists even when a user messages the business
// directly (no prior comment/rule match) — otherwise the inbox would have
// nowhere to attach the transcript. Automation-triggered conversations
// already exist by the time this is called, so this only fills the gap for
// "cold" inbound messages; ruleId/currentNodeId stay null for those.
export async function ensureConversationStub(params: {
  igAccountId: string;
  ownerUid: string;
  commenterIgId: string;
  commenterUsername: string;
}) {
  const conversationId = `${params.igAccountId}_${params.commenterIgId}`;
  const ref = db.collection('conversations').doc(conversationId);
  const snapshot = await ref.get();
  if (snapshot.exists) return conversationId;
  await ref.set({
    ownerUid: params.ownerUid,
    igAccountId: params.igAccountId,
    ruleId: null,
    commenterIgId: params.commenterIgId,
    commenterUsername: params.commenterUsername,
    currentNodeId: null,
    status: 'active',
    tags: [],
    lastInteractionAt: new Date(),
  });
  return conversationId;
}

export function nodeHasFurtherReply(node: DmFlowNode): boolean {
  return node.buttons.some((b) => b.action === 'reply');
}

// Meta's Graph API returns free-text error messages, not a stable enum — we
// match on documented, stable substrings rather than numeric codes (which
// vary/aren't reliably documented) so the user gets a specific reason
// instead of ManyChat's opaque "it just didn't work" complaint.
export type DmErrorCode = 'outside_window' | 'recipient_unavailable' | 'rate_limited' | 'unknown';

export function classifyDmError(rawMessage: string): DmErrorCode {
  const lower = rawMessage.toLowerCase();
  if (lower.includes('window') || lower.includes('24-hour') || lower.includes('7 day') || lower.includes('outside')) {
    return 'outside_window';
  }
  if (lower.includes('recipient') && (lower.includes('not available') || lower.includes('cannot') || lower.includes('unable'))) {
    return 'recipient_unavailable';
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'rate_limited';
  }
  return 'unknown';
}

export async function logAutomationEvent(entry: Record<string, unknown>) {
  await db.collection('automationLogs').add({ ...entry, createdAt: new Date() });
}

// `field` is the full dot-path under the rule doc, e.g. "stats.dmsSent" or
// "statsB.commentsMatched" (A/B variant) — not hardcoded to "stats." so
// callers can target either variant's counters.
export async function incrementRuleStats(ruleId: string, field: string) {
  await db
    .collection('rules')
    .doc(ruleId)
    .update({ [field]: FieldValue.increment(1) });
}
