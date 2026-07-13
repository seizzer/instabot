import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { REGION, db } from '../lib/admin';
import { postCommentReply } from '../lib/graphApi';
import {
  findRuleForComment,
  getAccessToken,
  getActiveRulesForAccount,
  getIgAccountByIgUserId,
  incrementRuleStats,
  logAutomationEvent,
  nodeHasFurtherReply,
  sendFlowNode,
  upsertConversation,
} from '../lib/dmFlowRuntime';
import { Rule } from '../lib/types';

interface CommentChangeValue {
  id: string;
  text: string;
  from: { id: string; username: string };
  media: { id: string };
}

interface MessagingPostback {
  sender: { id: string };
  recipient: { id: string };
  postback?: { title?: string; payload?: string };
}

export const processWebhookEvent = onDocumentCreated(
  { document: 'webhookEvents/{eventId}', region: REGION },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const payload = snapshot.data().rawPayload as {
      entry?: Array<{
        id: string;
        changes?: Array<{ field: string; value: CommentChangeValue }>;
        messaging?: MessagingPostback[];
      }>;
    };

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field === 'comments') {
          await handleCommentEvent(entry.id, change.value);
        }
      }
      for (const messagingEvent of entry.messaging ?? []) {
        if (messagingEvent.postback) {
          await handlePostbackEvent(entry.id, messagingEvent);
        }
      }
    }

    await snapshot.ref.update({ processed: true });
  }
);

async function handleCommentEvent(igBusinessAccountId: string, value: CommentChangeValue) {
  const igAccount = await getIgAccountByIgUserId(igBusinessAccountId);
  if (!igAccount || igAccount.status !== 'active') return;

  const accessToken = await getAccessToken(igAccount.id);
  if (!accessToken) return;

  const rules = await getActiveRulesForAccount(igAccount.id);
  const match = findRuleForComment(rules, value.media.id, value.text);
  if (!match) return;
  const { rule, matchedKeyword } = match;

  let publicReplySent = false;
  let dmSent = false;
  let dmError: string | null = null;

  if (rule.publicReplyEnabled && rule.publicReplyText) {
    try {
      await postCommentReply(value.id, rule.publicReplyText, accessToken);
      publicReplySent = true;
    } catch (err) {
      // Public reply failures aren't fatal — the DM attempt below still proceeds.
    }
  }

  if (rule.dmEnabled) {
    const startNode = rule.dmFlow.nodes[rule.dmFlow.startNodeId];
    try {
      await sendFlowNode({
        igUserId: igBusinessAccountId,
        accessToken,
        node: startNode,
        username: value.from.username,
        recipientCommentId: value.id,
      });
      dmSent = true;
      await upsertConversation({
        igAccountId: igAccount.id,
        ownerUid: igAccount.ownerUid,
        ruleId: rule.id,
        commenterIgId: value.from.id,
        commenterUsername: value.from.username,
        currentNodeId: startNode.id,
        status: nodeHasFurtherReply(rule.dmFlow, startNode) ? 'active' : 'completed',
      });
    } catch (err: any) {
      // Most common cause: sending outside Meta's 7-day private-reply window.
      dmError = err?.message ?? 'DM_SEND_FAILED';
    }
  }

  await logAutomationEvent({
    ownerUid: igAccount.ownerUid,
    igAccountId: igAccount.id,
    ruleId: rule.id,
    commentId: value.id,
    commentText: value.text,
    commenterIgId: value.from.id,
    commenterUsername: value.from.username,
    eventType: 'comment_match',
    matchedTrigger: 'keyword',
    matchedValue: matchedKeyword,
    publicReplySent,
    dmSent,
    buttonClicked: null,
    dmError,
    aiIntent: null,
    aiConfidence: null,
  });

  await incrementRuleStats(rule.id, 'commentsMatched');
  if (dmSent) await incrementRuleStats(rule.id, 'dmsSent');
  if (dmError) await incrementRuleStats(rule.id, 'dmsFailed');
}

async function handlePostbackEvent(igBusinessAccountId: string, messagingEvent: MessagingPostback) {
  const igAccount = await getIgAccountByIgUserId(igBusinessAccountId);
  if (!igAccount) return;

  const commenterIgId = messagingEvent.sender.id;
  const buttonId = messagingEvent.postback?.payload;
  if (!buttonId) return;

  const conversationId = `${igAccount.id}_${commenterIgId}`;
  const conversationSnap = await db.collection('conversations').doc(conversationId).get();
  if (!conversationSnap.exists) return;
  const conversation = conversationSnap.data()!;

  const ruleSnap = await db.collection('rules').doc(conversation.ruleId).get();
  if (!ruleSnap.exists) return;
  const rule = { id: ruleSnap.id, ...ruleSnap.data() } as Rule;

  const currentNode = rule.dmFlow.nodes[conversation.currentNodeId];
  const button = currentNode?.buttons.find((b) => b.id === buttonId);
  if (!currentNode || !button) return;

  const accessToken = await getAccessToken(igAccount.id);
  if (!accessToken) return;

  let nextNodeId: string | null = null;
  let conversationStatus: 'active' | 'completed' = 'completed';

  if (button.action === 'reply' && button.targetNodeId) {
    const nextNode = rule.dmFlow.nodes[button.targetNodeId];
    await sendFlowNode({
      igUserId: igBusinessAccountId,
      accessToken,
      node: nextNode,
      username: conversation.commenterUsername,
      recipientUserId: commenterIgId,
    });
    nextNodeId = nextNode.id;
    conversationStatus = nextNode.buttons.some((b) => b.action === 'reply') ? 'active' : 'completed';
  } else if (button.action === 'file' && button.fileUrl) {
    await sendFlowNode({
      igUserId: igBusinessAccountId,
      accessToken,
      node: { id: 'adhoc', type: 'file', text: '', mediaUrl: button.fileUrl, buttons: [] },
      username: conversation.commenterUsername,
      recipientUserId: commenterIgId,
    });
  }
  // action === 'url': handled entirely client-side by Instagram, nothing to send.

  if (nextNodeId) {
    await upsertConversation({
      igAccountId: igAccount.id,
      ownerUid: igAccount.ownerUid,
      ruleId: rule.id,
      commenterIgId,
      commenterUsername: conversation.commenterUsername,
      currentNodeId: nextNodeId,
      status: conversationStatus,
    });
  } else {
    await db.collection('conversations').doc(conversationId).update({ status: 'completed' });
  }

  await logAutomationEvent({
    ownerUid: igAccount.ownerUid,
    igAccountId: igAccount.id,
    ruleId: rule.id,
    commentId: null,
    commentText: null,
    commenterIgId,
    commenterUsername: conversation.commenterUsername,
    eventType: 'button_click',
    matchedTrigger: 'keyword',
    matchedValue: buttonId,
    publicReplySent: false,
    dmSent: true,
    buttonClicked: buttonId,
    dmError: null,
    aiIntent: null,
    aiConfidence: null,
  });

  await incrementRuleStats(rule.id, 'buttonClicks');
}
