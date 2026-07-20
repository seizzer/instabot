import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { REGION, db } from '../lib/admin';
import { getCommentDetails, getInstagramUsername, postCommentReply } from '../lib/graphApi';
import {
  classifyDmError,
  ensureConversationStub,
  findRuleForComment,
  getAccessToken,
  getActiveRulesForAccount,
  getIgAccountByIgUserId,
  incrementRuleStats,
  logAutomationEvent,
  logMessage,
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

// Instagram only tells us the comment a mention happened in — no commenter
// identity/text, and no info at all when the mention is in someone's own
// post/story caption rather than a comment (see getCommentDetails/handleMentionEvent).
interface MentionChangeValue {
  media_id?: string;
  comment_id?: string;
}

interface MessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp?: number;
  postback?: { title?: string; payload?: string };
  reaction?: { mid: string; action: 'react' | 'unreact'; reaction?: string; emoji?: string };
  referral?: { ref?: string; source?: string; type?: string };
  read?: { mid?: string };
  message?: {
    mid: string;
    text?: string;
    is_echo?: boolean;
    // Story mentions arrive as an attachment (no text) — a CDN url to the
    // story frame, never the commenter's own message content.
    attachments?: { type: string; payload?: { url?: string } }[];
    // Story replies arrive as a normal message with `text` PLUS this,
    // identifying which story was replied to.
    reply_to?: { story?: { url?: string; id?: string } };
  };
}

export const processWebhookEvent = onDocumentCreated(
  { document: 'webhookEvents/{eventId}', region: REGION },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const payload = snapshot.data().rawPayload as {
      entry?: Array<{
        id: string;
        changes?: Array<{ field: string; value: CommentChangeValue | MentionChangeValue }>;
        messaging?: MessagingEvent[];
      }>;
    };

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field === 'comments') {
          await handleCommentEvent(entry.id, change.value as CommentChangeValue);
        } else if (change.field === 'mentions') {
          await handleMentionEvent(entry.id, change.value as MentionChangeValue);
        }
      }
      for (const messagingEvent of entry.messaging ?? []) {
        if (messagingEvent.postback) {
          await handlePostbackEvent(entry.id, messagingEvent);
        } else if (messagingEvent.reaction) {
          await handleReactionEvent(entry.id, messagingEvent);
        } else if (messagingEvent.referral) {
          await handleReferralEvent(entry.id, messagingEvent);
        } else if (messagingEvent.read) {
          await handleSeenEvent(entry.id, messagingEvent);
        } else if (messagingEvent.message?.attachments?.some((a) => a.type === 'story_mention')) {
          await handleStoryMentionEvent(entry.id, messagingEvent);
        } else if (messagingEvent.message?.reply_to?.story) {
          await handleStoryReplyEvent(entry.id, messagingEvent);
        } else if (messagingEvent.message) {
          await handleMessageEvent(entry.id, messagingEvent);
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

  // A/B test: a coin flip per event, not per rule-load, so traffic actually
  // splits ~50/50 over time instead of sticking to whichever variant won
  // the first flip for a given cached rule fetch.
  const useVariantB = !!rule.variantB && Math.random() < 0.5;
  const publicReplyText = useVariantB ? rule.variantB!.publicReplyText : rule.publicReplyText;
  const dmFlow = useVariantB ? rule.variantB!.dmFlow : rule.dmFlow;
  const statsField = useVariantB ? 'statsB' : 'stats';

  let publicReplySent = false;
  let dmSent = false;
  let dmError: string | null = null;
  let dmErrorCode: string | null = null;

  if (rule.publicReplyEnabled && publicReplyText) {
    try {
      await postCommentReply(value.id, publicReplyText, accessToken);
      publicReplySent = true;
    } catch (err) {
      // Public reply failures aren't fatal — the DM attempt below still proceeds.
    }
  }

  if (rule.dmEnabled) {
    const startNode = dmFlow.nodes[dmFlow.startNodeId];
    try {
      await sendFlowNode({
        igUserId: igBusinessAccountId,
        accessToken,
        node: startNode,
        username: value.from.username,
        recipientCommentId: value.id,
        conversationId: `${igAccount.id}_${value.from.id}`,
      });
      dmSent = true;
      await upsertConversation({
        igAccountId: igAccount.id,
        ownerUid: igAccount.ownerUid,
        ruleId: rule.id,
        commenterIgId: value.from.id,
        commenterUsername: value.from.username,
        currentNodeId: startNode.id,
        status: nodeHasFurtherReply(startNode) ? 'active' : 'completed',
      });
    } catch (err: any) {
      // Most common cause: sending outside Meta's 7-day private-reply window.
      dmError = err?.message ?? 'DM_SEND_FAILED';
      dmErrorCode = classifyDmError(dmError!);
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
    dmErrorCode,
    variant: useVariantB ? 'b' : 'a',
    aiIntent: null,
    aiConfidence: null,
  });

  await incrementRuleStats(rule.id, `${statsField}.commentsMatched`);
  if (dmSent) await incrementRuleStats(rule.id, `${statsField}.dmsSent`);
  if (dmError) await incrementRuleStats(rule.id, `${statsField}.dmsFailed`);
}

async function handlePostbackEvent(igBusinessAccountId: string, messagingEvent: MessagingEvent) {
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
      conversationId,
    });
    nextNodeId = nextNode.id;
    conversationStatus = nodeHasFurtherReply(nextNode) ? 'active' : 'completed';
  } else if (button.action === 'file' && button.fileUrl) {
    await sendFlowNode({
      igUserId: igBusinessAccountId,
      accessToken,
      node: { id: 'adhoc', type: 'file', text: '', mediaUrl: button.fileUrl, buttons: [] },
      username: conversation.commenterUsername,
      recipientUserId: commenterIgId,
      conversationId,
    });
  } else if (button.action === 'delayed_reply' && button.targetNodeId && button.delayHours) {
    // Drip/follow-up step — don't send now, queue it for
    // processScheduledMessages to pick up once it's due.
    await db.collection('scheduledMessages').add({
      ownerUid: igAccount.ownerUid,
      igAccountId: igAccount.id,
      igUserId: igBusinessAccountId,
      ruleId: rule.id,
      commenterIgId,
      commenterUsername: conversation.commenterUsername,
      nodeId: button.targetNodeId,
      conversationId,
      dueAt: new Date(Date.now() + button.delayHours * 60 * 60 * 1000),
      sent: false,
      createdAt: new Date(),
    });
    nextNodeId = button.targetNodeId;
    conversationStatus = 'active';
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

  await incrementRuleStats(rule.id, 'stats.buttonClicks');
}

async function handleMentionEvent(igBusinessAccountId: string, value: MentionChangeValue) {
  // Mentions in someone's own post/story caption (no comment_id) have no DM
  // channel available under Meta's messaging window policy — the raw event
  // is already preserved in webhookEvents, nothing further to do here.
  if (!value.comment_id) return;

  const igAccount = await getIgAccountByIgUserId(igBusinessAccountId);
  if (!igAccount || igAccount.status !== 'active') return;

  const accessToken = await getAccessToken(igAccount.id);
  if (!accessToken) return;

  const rules = await getActiveRulesForAccount(igAccount.id);
  const rule = rules.find((r) => r.triggerType === 'mention');
  if (!rule || !rule.dmEnabled) return;

  const comment = await getCommentDetails(value.comment_id, accessToken);
  const username = comment.username ?? '';

  let dmSent = false;
  let dmError: string | null = null;
  let dmErrorCode: string | null = null;
  const startNode = rule.dmFlow.nodes[rule.dmFlow.startNodeId];
  try {
    await sendFlowNode({
      igUserId: igBusinessAccountId,
      accessToken,
      node: startNode,
      username,
      recipientCommentId: value.comment_id,
      // No conversationId here on purpose — mentions don't give us the
      // commenter's numeric IG id (only username), and conversations are
      // keyed by igAccountId_commenterIgId everywhere else. Fabricating a
      // username-keyed id would create a duplicate, inconsistent doc if
      // this same person later comments/messages normally.
    });
    dmSent = true;
  } catch (err: any) {
    dmError = err?.message ?? 'DM_SEND_FAILED';
    dmErrorCode = classifyDmError(dmError!);
  }

  await logAutomationEvent({
    ownerUid: igAccount.ownerUid,
    igAccountId: igAccount.id,
    ruleId: rule.id,
    commentId: value.comment_id,
    commentText: comment.text ?? null,
    commenterIgId: null,
    commenterUsername: username,
    eventType: 'mention_match',
    matchedTrigger: 'mention',
    matchedValue: 'mention',
    publicReplySent: false,
    dmSent,
    buttonClicked: null,
    dmError,
    dmErrorCode,
    aiIntent: null,
    aiConfidence: null,
  });

  if (dmSent) await incrementRuleStats(rule.id, 'stats.dmsSent');
  if (dmError) await incrementRuleStats(rule.id, 'stats.dmsFailed');
}

async function handleReactionEvent(igBusinessAccountId: string, messagingEvent: MessagingEvent) {
  // Only a fresh reaction should trigger a follow-up — ignore 'unreact'.
  const reaction = messagingEvent.reaction;
  if (!reaction || reaction.action !== 'react') return;

  const igAccount = await getIgAccountByIgUserId(igBusinessAccountId);
  if (!igAccount) return;

  const commenterIgId = messagingEvent.sender.id;
  const conversationId = `${igAccount.id}_${commenterIgId}`;
  const conversationSnap = await db.collection('conversations').doc(conversationId).get();
  if (!conversationSnap.exists) return;
  const conversation = conversationSnap.data()!;

  const emoji = reaction.emoji ?? reaction.reaction ?? null;
  const rules = await getActiveRulesForAccount(igAccount.id);
  const rule = rules.find(
    (r) => r.triggerType === 'reaction' && (!r.reactionFilter || r.reactionFilter === emoji)
  );
  if (!rule || !rule.dmEnabled) return;

  const accessToken = await getAccessToken(igAccount.id);
  if (!accessToken) return;

  let dmSent = false;
  let dmError: string | null = null;
  let dmErrorCode: string | null = null;
  const startNode = rule.dmFlow.nodes[rule.dmFlow.startNodeId];
  try {
    await sendFlowNode({
      igUserId: igBusinessAccountId,
      accessToken,
      node: startNode,
      username: conversation.commenterUsername,
      recipientUserId: commenterIgId,
      conversationId,
    });
    dmSent = true;
    await upsertConversation({
      igAccountId: igAccount.id,
      ownerUid: igAccount.ownerUid,
      ruleId: rule.id,
      commenterIgId,
      commenterUsername: conversation.commenterUsername,
      currentNodeId: startNode.id,
      status: nodeHasFurtherReply(startNode) ? 'active' : 'completed',
    });
  } catch (err: any) {
    dmError = err?.message ?? 'DM_SEND_FAILED';
    dmErrorCode = classifyDmError(dmError!);
  }

  await logAutomationEvent({
    ownerUid: igAccount.ownerUid,
    igAccountId: igAccount.id,
    ruleId: rule.id,
    commentId: null,
    commentText: null,
    commenterIgId,
    commenterUsername: conversation.commenterUsername,
    eventType: 'reaction_match',
    matchedTrigger: 'reaction',
    matchedValue: emoji ?? 'any',
    publicReplySent: false,
    dmSent,
    buttonClicked: null,
    dmError,
    dmErrorCode,
    aiIntent: null,
    aiConfidence: null,
  });

  if (dmSent) await incrementRuleStats(rule.id, 'stats.dmsSent');
  if (dmError) await incrementRuleStats(rule.id, 'stats.dmsFailed');
}

// Someone tagged the account in their own Story — arrives with no text, only
// a CDN attachment. Unlike the comment-based 'mention' trigger, we get the
// commenter's numeric IG id here, so a real conversation can be opened.
async function handleStoryMentionEvent(igBusinessAccountId: string, messagingEvent: MessagingEvent) {
  const igAccount = await getIgAccountByIgUserId(igBusinessAccountId);
  if (!igAccount || igAccount.status !== 'active') return;

  const rules = await getActiveRulesForAccount(igAccount.id);
  const rule = rules.find((r) => r.triggerType === 'story_mention');
  if (!rule || !rule.dmEnabled) return;

  const accessToken = await getAccessToken(igAccount.id);
  if (!accessToken) return;

  const commenterIgId = messagingEvent.sender.id;
  let username = '';
  try {
    username = await getInstagramUsername(commenterIgId, accessToken);
  } catch {
    // Username is a nice-to-have for display — sending still works with an empty one.
  }

  const conversationId = `${igAccount.id}_${commenterIgId}`;
  let dmSent = false;
  let dmError: string | null = null;
  let dmErrorCode: string | null = null;
  const startNode = rule.dmFlow.nodes[rule.dmFlow.startNodeId];
  try {
    await sendFlowNode({
      igUserId: igBusinessAccountId,
      accessToken,
      node: startNode,
      username,
      recipientUserId: commenterIgId,
      conversationId,
    });
    dmSent = true;
    await upsertConversation({
      igAccountId: igAccount.id,
      ownerUid: igAccount.ownerUid,
      ruleId: rule.id,
      commenterIgId,
      commenterUsername: username,
      currentNodeId: startNode.id,
      status: nodeHasFurtherReply(startNode) ? 'active' : 'completed',
    });
  } catch (err: any) {
    dmError = err?.message ?? 'DM_SEND_FAILED';
    dmErrorCode = classifyDmError(dmError!);
  }

  await logAutomationEvent({
    ownerUid: igAccount.ownerUid,
    igAccountId: igAccount.id,
    ruleId: rule.id,
    commentId: null,
    commentText: null,
    commenterIgId,
    commenterUsername: username,
    eventType: 'story_mention_match',
    matchedTrigger: 'story_mention',
    matchedValue: 'story_mention',
    publicReplySent: false,
    dmSent,
    buttonClicked: null,
    dmError,
    dmErrorCode,
    aiIntent: null,
    aiConfidence: null,
  });

  if (dmSent) await incrementRuleStats(rule.id, 'stats.dmsSent');
  if (dmError) await incrementRuleStats(rule.id, 'stats.dmsFailed');
}

// Someone replied to the account's own Story — arrives as a normal message
// with `text` plus `reply_to.story` identifying which story.
async function handleStoryReplyEvent(igBusinessAccountId: string, messagingEvent: MessagingEvent) {
  const igAccount = await getIgAccountByIgUserId(igBusinessAccountId);
  if (!igAccount || igAccount.status !== 'active') return;

  const rules = await getActiveRulesForAccount(igAccount.id);
  const rule = rules.find((r) => r.triggerType === 'story_reply');
  if (!rule || !rule.dmEnabled) return;

  const accessToken = await getAccessToken(igAccount.id);
  if (!accessToken) return;

  const commenterIgId = messagingEvent.sender.id;
  const replyText = messagingEvent.message?.text ?? '';
  let username = '';
  try {
    username = await getInstagramUsername(commenterIgId, accessToken);
  } catch {
    // Username is a nice-to-have for display — sending still works with an empty one.
  }

  const conversationId = `${igAccount.id}_${commenterIgId}`;
  let dmSent = false;
  let dmError: string | null = null;
  let dmErrorCode: string | null = null;
  const startNode = rule.dmFlow.nodes[rule.dmFlow.startNodeId];
  try {
    await sendFlowNode({
      igUserId: igBusinessAccountId,
      accessToken,
      node: startNode,
      username,
      recipientUserId: commenterIgId,
      conversationId,
    });
    dmSent = true;
    await upsertConversation({
      igAccountId: igAccount.id,
      ownerUid: igAccount.ownerUid,
      ruleId: rule.id,
      commenterIgId,
      commenterUsername: username,
      currentNodeId: startNode.id,
      status: nodeHasFurtherReply(startNode) ? 'active' : 'completed',
    });
  } catch (err: any) {
    dmError = err?.message ?? 'DM_SEND_FAILED';
    dmErrorCode = classifyDmError(dmError!);
  }

  await logAutomationEvent({
    ownerUid: igAccount.ownerUid,
    igAccountId: igAccount.id,
    ruleId: rule.id,
    commentId: null,
    commentText: replyText || null,
    commenterIgId,
    commenterUsername: username,
    eventType: 'story_reply_match',
    matchedTrigger: 'story_reply',
    matchedValue: replyText || 'story_reply',
    publicReplySent: false,
    dmSent,
    buttonClicked: null,
    dmError,
    dmErrorCode,
    aiIntent: null,
    aiConfidence: null,
  });

  if (dmSent) await incrementRuleStats(rule.id, 'stats.dmsSent');
  if (dmError) await incrementRuleStats(rule.id, 'stats.dmsFailed');
}

async function handleReferralEvent(igBusinessAccountId: string, messagingEvent: MessagingEvent) {
  const igAccount = await getIgAccountByIgUserId(igBusinessAccountId);
  if (!igAccount) return;

  const conversationId = `${igAccount.id}_${messagingEvent.sender.id}`;
  const conversationSnap = await db.collection('conversations').doc(conversationId).get();
  if (!conversationSnap.exists) return;

  const referralSource = messagingEvent.referral?.source ?? messagingEvent.referral?.ref ?? null;
  await conversationSnap.ref.update({ referralSource });
}

async function handleSeenEvent(igBusinessAccountId: string, messagingEvent: MessagingEvent) {
  const igAccount = await getIgAccountByIgUserId(igBusinessAccountId);
  if (!igAccount) return;

  const conversationId = `${igAccount.id}_${messagingEvent.sender.id}`;
  const conversationSnap = await db.collection('conversations').doc(conversationId).get();
  if (!conversationSnap.exists) return;

  const lastSeenAt = messagingEvent.timestamp ? new Date(messagingEvent.timestamp) : new Date();
  await conversationSnap.ref.update({ lastSeenAt });
}

// Plain-text DMs never triggered automation before (silently dropped) — now
// stored so the manual inbox has a real transcript, including messages from
// people who never commented/reacted first. `is_echo` events are Meta
// echoing back messages OUR page sent (already logged by sendFlowNode /
// sendManualMessage), so those are skipped to avoid double-logging.
async function handleMessageEvent(igBusinessAccountId: string, messagingEvent: MessagingEvent) {
  if (messagingEvent.message?.is_echo) return;
  const text = messagingEvent.message?.text;
  if (!text) return;

  const igAccount = await getIgAccountByIgUserId(igBusinessAccountId);
  if (!igAccount) return;

  const commenterIgId = messagingEvent.sender.id;
  const accessToken = await getAccessToken(igAccount.id);
  let commenterUsername = '';
  if (accessToken) {
    try {
      commenterUsername = await getInstagramUsername(commenterIgId, accessToken);
    } catch {
      // Username is a nice-to-have for display — the transcript still saves without it.
    }
  }

  const conversationId = await ensureConversationStub({
    igAccountId: igAccount.id,
    ownerUid: igAccount.ownerUid,
    commenterIgId,
    commenterUsername,
  });
  await logMessage({ conversationId, direction: 'inbound', text });
  await db
    .collection('conversations')
    .doc(conversationId)
    .update({ lastInteractionAt: new Date() });
}
