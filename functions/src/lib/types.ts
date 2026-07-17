// Mirrors app/src/types/models.ts — kept separate because the mobile app and
// Cloud Functions are independent TypeScript projects (no shared package yet).
// If the two start drifting, consider extracting a shared `packages/shared` module.

export type ButtonAction = 'reply' | 'url' | 'file' | 'delayed_reply';

export interface DmFlowButton {
  id: string;
  label: string;
  action: ButtonAction;
  targetNodeId: string | null;
  url: string | null;
  fileUrl: string | null;
  // Only meaningful when action === 'delayed_reply' — hours to wait before
  // sending targetNodeId's message via the scheduled processor instead of
  // immediately (drip/follow-up sequences).
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

export type RuleTriggerType = 'keyword' | 'ai_intent' | 'mention' | 'reaction';
export type RuleStatus = 'active' | 'paused';
export type RuleTargetScope = 'all_posts' | 'specific_posts';

export interface RuleStats {
  commentsMatched: number;
  dmsSent: number;
  dmsFailed: number;
  buttonClicks: number;
}

// A/B testing: when set, incoming matches are randomly split between the
// rule's primary publicReplyText/dmFlow ("A") and this ("B"), each tracked
// separately via stats/statsB — lets a user compare which wording converts
// better without needing two separate rules competing on priority.
export interface RuleVariant {
  publicReplyText: string;
  dmFlow: DmFlow;
}

export interface Rule {
  id: string;
  ownerUid: string;
  igAccountId: string;
  name: string;
  targetScope: RuleTargetScope;
  targetPostIds: string[];
  triggerType: RuleTriggerType;
  keywords: string[];
  aiIntentTags: string[];
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
}

export type IgAccountStatus = 'active' | 'token_expired' | 'revoked';

export interface IgAccount {
  id: string;
  ownerUid: string;
  igUserId: string;
  igUsername: string;
  fbPageId: string;
  status: IgAccountStatus;
  webhookSubscribed: boolean;
}

export interface Conversation {
  ownerUid: string;
  igAccountId: string;
  // Null for conversations that started from a direct message rather than a
  // rule match (see dmFlowRuntime.ensureConversationStub) — the inbox needs
  // somewhere to attach a transcript even when no automation ever ran.
  ruleId: string | null;
  commenterIgId: string;
  commenterUsername: string;
  currentNodeId: string | null;
  status: 'active' | 'completed';
  referralSource: string | null;
  lastSeenAt: number | null;
  tags: string[];
}

export interface ConversationMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  text: string;
  createdAt: number;
}

// A single button "wait N hours, then send" step waiting to fire —
// processed by the scheduled processScheduledMessages function.
export interface ScheduledMessage {
  id: string;
  ownerUid: string;
  igAccountId: string;
  igUserId: string;
  ruleId: string;
  commenterIgId: string;
  commenterUsername: string;
  nodeId: string;
  conversationId: string;
  dueAt: number;
  sent: boolean;
  createdAt: number;
}

export type BroadcastStatus = 'draft' | 'sending' | 'sent' | 'failed';

// One-off message sent to every conversation currently within Meta's
// messaging window (optionally filtered by tag) — sendBroadcast enforces
// the window check server-side so this can never be used to cold-DM.
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
