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
}

export async function sendFlowNode(params: SendNodeParams) {
  await sendDirectMessage({
    igUserId: params.igUserId,
    accessToken: params.accessToken,
    recipientCommentId: params.recipientCommentId,
    recipientUserId: params.recipientUserId,
    text: fillTemplate(params.node.text, params.username),
    buttons: params.node.buttons,
    mediaUrl: params.node.type === 'file' ? params.node.mediaUrl : null,
  });
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

export function nodeHasFurtherReply(node: DmFlowNode): boolean {
  return node.buttons.some((b) => b.action === 'reply');
}

export async function logAutomationEvent(entry: Record<string, unknown>) {
  await db.collection('automationLogs').add({ ...entry, createdAt: new Date() });
}

export async function incrementRuleStats(ruleId: string, field: string) {
  await db
    .collection('rules')
    .doc(ruleId)
    .update({ [`stats.${field}`]: FieldValue.increment(1) });
}
