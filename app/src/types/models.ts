export type SubscriptionTier = 'free' | 'pro';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  locale: 'tr' | 'en';
  onboardingCompleted: boolean;
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

export type ButtonAction = 'reply' | 'url' | 'file';

export interface DmFlowButton {
  id: string;
  label: string;
  action: ButtonAction;
  targetNodeId: string | null;
  url: string | null;
  fileUrl: string | null;
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

export type RuleTriggerType = 'keyword' | 'ai_intent';
export type RuleStatus = 'active' | 'paused';
export type RuleTargetScope = 'all_posts' | 'specific_posts';

export interface RuleStats {
  commentsMatched: number;
  dmsSent: number;
  dmsFailed: number;
  buttonClicks: number;
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
  publicReplyEnabled: boolean;
  publicReplyText: string;
  dmEnabled: boolean;
  dmFlow: DmFlow;
  priority: number;
  status: RuleStatus;
  stats: RuleStats;
  createdAt: number;
  updatedAt: number;
}

export type AutomationEventType = 'comment_match' | 'button_click';

export interface AutomationLog {
  id: string;
  ownerUid: string;
  igAccountId: string;
  ruleId: string;
  commentId: string | null;
  commentText: string | null;
  commenterIgId: string;
  commenterUsername: string;
  eventType: AutomationEventType;
  matchedTrigger: 'keyword' | 'ai';
  matchedValue: string;
  publicReplySent: boolean;
  dmSent: boolean;
  buttonClicked: string | null;
  dmError: string | null;
  aiIntent: string | null;
  aiConfidence: number | null;
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
