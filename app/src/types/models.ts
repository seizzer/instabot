export type SubscriptionTier = 'free' | 'pro';

export interface UserProfile {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  locale: 'tr' | 'en';
  onboardingCompleted: boolean;
  notificationsEnabled: boolean;
  createdAt: number;
}

export type IgAccountStatus = 'active' | 'token_expired' | 'revoked';

export interface IgAccount {
  id: string;
  ownerUid: string;
  igUserId: string;
  igUsername: string;
  fbPageId: string;
  status: IgAccountStatus;
  tokenExpiresAt: number;
  webhookSubscribed: boolean;
  connectedAt: number;
}

export type WhatsAppAccountStatus = 'active' | 'token_expired' | 'revoked';

export interface WhatsAppAccount {
  id: string;
  ownerUid: string;
  phoneNumberId: string;
  wabaId: string;
  displayPhoneNumber: string;
  verifiedName: string;
  status: WhatsAppAccountStatus;
  connectedAt: number;
}

export type ButtonAction = 'reply' | 'url' | 'file' | 'delayed_reply';

export interface DmFlowButton {
  id: string;
  label: string;
  action: ButtonAction;
  targetNodeId: string | null;
  url: string | null;
  fileUrl: string | null;
  // Only meaningful when action === 'delayed_reply' — hours to wait before
  // the scheduled processor sends targetNodeId's message (drip/follow-up).
  delayHours: number | null;
}

export type DmNodeType = 'text' | 'file';

export interface DmFlowNode {
  id: string;
  type: DmNodeType;
  text: string;
  mediaUrl: string | null;
  buttons: DmFlowButton[];
}

export interface DmFlow {
  startNodeId: string;
  nodes: Record<string, DmFlowNode>;
}

export type RuleTriggerType =
  | 'keyword'
  | 'ai_intent'
  | 'mention'
  | 'reaction'
  | 'story_mention'
  | 'story_reply';
export type RuleStatus = 'active' | 'paused';
export type RuleTargetScope = 'all_posts' | 'specific_posts';

export interface RuleStats {
  commentsMatched: number;
  dmsSent: number;
  dmsFailed: number;
  buttonClicks: number;
}

// A/B testing: when set, incoming matches are randomly split between the
// rule's primary publicReplyText/dmFlow ("A") and this ("B"), tracked
// separately via stats/statsB.
export interface RuleVariant {
  publicReplyText: string;
  dmFlow: DmFlow;
}

// 'instagram' rules key off igAccountId (also covers Messenger — same
// connected account, no separate field needed). 'whatsapp' rules key off
// whatsAppAccountId instead — a WhatsApp number is a wholly separate
// connected channel, not tied to an IG account.
export type RulePlatform = 'instagram' | 'whatsapp';

export interface Rule {
  id: string;
  ownerUid: string;
  igAccountId: string;
  platform: RulePlatform;
  whatsAppAccountId: string | null;
  name: string;
  targetScope: RuleTargetScope;
  targetPostIds: string[];
  triggerType: RuleTriggerType;
  keywords: string[];
  aiIntentTags: string[];
  // Only meaningful when triggerType === 'reaction' — the emoji to match, or
  // null to match any reaction on a message sent within an active conversation.
  reactionFilter: string | null;
  publicReplyEnabled: boolean;
  publicReplyText: string;
  dmEnabled: boolean;
  dmFlow: DmFlow;
  variantB: RuleVariant | null;
  priority: number;
  status: RuleStatus;
  stats: RuleStats;
  statsB: RuleStats;
  createdAt: number;
  updatedAt: number;
}

export type AutomationEventType =
  | 'comment_match'
  | 'button_click'
  | 'mention_match'
  | 'reaction_match'
  | 'story_mention_match'
  | 'story_reply_match';

export interface AutomationLog {
  id: string;
  ownerUid: string;
  igAccountId: string;
  ruleId: string;
  commentId: string | null;
  commentText: string | null;
  commenterIgId: string | null;
  commenterUsername: string;
  eventType: AutomationEventType;
  matchedTrigger: 'keyword' | 'ai' | 'mention' | 'reaction' | 'story_mention' | 'story_reply';
  matchedValue: string;
  publicReplySent: boolean;
  dmSent: boolean;
  buttonClicked: string | null;
  dmError: string | null;
  dmErrorCode: DmErrorCode | null;
  variant: 'a' | 'b' | null;
  aiIntent: string | null;
  aiConfidence: number | null;
  createdAt: number;
}

export type DmErrorCode = 'outside_window' | 'recipient_unavailable' | 'rate_limited' | 'unknown';

export interface Conversation {
  id: string;
  ownerUid: string;
  igAccountId: string;
  ruleId: string | null;
  commenterIgId: string;
  commenterUsername: string;
  currentNodeId: string | null;
  status: 'active' | 'completed';
  referralSource: string | null;
  lastSeenAt: number | null;
  lastInteractionAt: number;
  tags: string[];
}

export interface ConversationMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  text: string;
  createdAt: number;
}

export type BroadcastStatus = 'draft' | 'sending' | 'sent' | 'failed';

export interface Broadcast {
  id: string;
  ownerUid: string;
  igAccountId: string;
  text: string;
  targetTag: string | null;
  status: BroadcastStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: number;
}

export interface Subscription {
  tier: SubscriptionTier;
  entitlementActive: boolean;
  freePostUsed: boolean;
  revenueCatCustomerId: string | null;
  expiresAt: number | null;
  updatedAt: number;
}

export function createEmptyRuleStats(): RuleStats {
  return { commentsMatched: 0, dmsSent: 0, dmsFailed: 0, buttonClicks: 0 };
}

export function createEmptyDmFlow(initialText = ''): DmFlow {
  const startNodeId = 'node_start';
  return {
    startNodeId,
    nodes: {
      [startNodeId]: {
        id: startNodeId,
        type: 'text',
        text: initialText,
        mediaUrl: null,
        buttons: [],
      },
    },
  };
}
