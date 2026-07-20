import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION, db } from '../lib/admin';
import {
  getAccessToken,
  getWhatsAppAccessToken,
  logAutomationEvent,
  sendFlowNode,
  sendWhatsAppFlowNode,
} from '../lib/dmFlowRuntime';
import { Rule } from '../lib/types';

// Drip/follow-up steps queued by processWebhookEvent's 'delayed_reply'
// button action — checked every 15 minutes rather than scheduled precisely
// per-message, matching this project's existing scheduled-function pattern
// (refreshInstagramTokens) instead of adding a per-message Cloud Task.
export const processScheduledMessages = onSchedule(
  { schedule: 'every 15 minutes', timeZone: 'Europe/Istanbul', region: REGION },
  async () => {
    const now = new Date();
    const snapshot = await db
      .collection('scheduledMessages')
      .where('sent', '==', false)
      .where('dueAt', '<=', now)
      .limit(100)
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      try {
        const ruleSnap = await db.collection('rules').doc(data.ruleId).get();
        if (!ruleSnap.exists) {
          await doc.ref.update({ sent: true });
          continue;
        }
        const rule = { id: ruleSnap.id, ...ruleSnap.data() } as Rule;
        const node = rule.dmFlow.nodes[data.nodeId];
        if (!node) {
          await doc.ref.update({ sent: true });
          continue;
        }

        // rule.platform decides both which secrets collection to read the
        // token from and which Graph API shape to send with — igAccountId
        // holds the whatsAppAccounts doc id for WhatsApp-owned rules (see
        // handleWhatsAppButtonReply, which reuses this field rather than
        // adding a parallel schema just for this channel).
        const isWhatsApp = rule.platform === 'whatsapp';
        const accessToken = isWhatsApp
          ? await getWhatsAppAccessToken(data.igAccountId)
          : await getAccessToken(data.igAccountId);
        if (!accessToken) continue; // retry next run once reconnected

        if (isWhatsApp) {
          await sendWhatsAppFlowNode({
            phoneNumberId: data.igUserId,
            accessToken,
            node,
            username: data.commenterUsername,
            recipientWaId: data.commenterIgId,
            conversationId: data.conversationId,
          });
        } else {
          await sendFlowNode({
            igUserId: data.igUserId,
            accessToken,
            node,
            username: data.commenterUsername,
            recipientUserId: data.commenterIgId,
            conversationId: data.conversationId,
          });
        }

        await logAutomationEvent({
          ownerUid: data.ownerUid,
          igAccountId: data.igAccountId,
          ruleId: data.ruleId,
          commentId: null,
          commentText: null,
          commenterIgId: data.commenterIgId,
          commenterUsername: data.commenterUsername,
          eventType: 'button_click',
          matchedTrigger: 'keyword',
          matchedValue: 'delayed_reply',
          publicReplySent: false,
          dmSent: true,
          buttonClicked: null,
          dmError: null,
          aiIntent: null,
          aiConfidence: null,
        });

        await doc.ref.update({ sent: true });
      } catch (err) {
        // Most common cause: the 7-day/24-hour messaging window closed
        // while this was queued — mark sent so it doesn't retry forever.
        await doc.ref.update({ sent: true });
      }
    }
  }
);
