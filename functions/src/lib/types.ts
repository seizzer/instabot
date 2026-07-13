// Mirrors app/src/types/models.ts — kept separate because the mobile app and
// Cloud Functions are independent TypeScript projects (no shared package yet).
// If the two start drifting, consider extracting a shared `packages/shared` module.

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
  ruleId: string;
  commenterIgId: string;
  commenterUsername: string;
  currentNodeId: string;
  status: 'active' | 'completed';
}
