import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  AutomationLog,
  Broadcast,
  Conversation,
  ConversationMessage,
  IgAccount,
  Rule,
  RuleStatus,
  Subscription,
} from '../types/models';

function toMillis(value: any): number {
  return value?.toMillis?.() ?? Date.now();
}

// ---- igAccounts ----

export function subscribeToIgAccounts(
  ownerUid: string,
  callback: (accounts: IgAccount[]) => void
) {
  const q = query(collection(db, 'igAccounts'), where('ownerUid', '==', ownerUid));
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerUid: data.ownerUid,
          igUserId: data.igUserId,
          igUsername: data.igUsername,
          fbPageId: data.fbPageId,
          status: data.status,
          tokenExpiresAt: toMillis(data.tokenExpiresAt),
          webhookSubscribed: !!data.webhookSubscribed,
          connectedAt: toMillis(data.connectedAt),
        } as IgAccount;
      })
    );
  });
}

// ---- rules ----

function toRule(id: string, data: any): Rule {
  return {
    id,
    ...data,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  } as Rule;
}

export function subscribeToRules(ownerUid: string, callback: (rules: Rule[]) => void) {
  const q = query(
    collection(db, 'rules'),
    where('ownerUid', '==', ownerUid),
    orderBy('priority', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => toRule(d.id, d.data())));
  });
}

export async function getRule(ruleId: string): Promise<Rule | null> {
  const snapshot = await getDoc(doc(db, 'rules', ruleId));
  if (!snapshot.exists()) return null;
  return toRule(snapshot.id, snapshot.data());
}

export async function createRule(rule: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = await addDoc(collection(db, 'rules'), {
    ...rule,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateRule(ruleId: string, updates: Partial<Rule>) {
  await updateDoc(doc(db, 'rules', ruleId), { ...updates, updatedAt: serverTimestamp() });
}

export async function setRuleStatus(ruleId: string, status: RuleStatus) {
  await updateRule(ruleId, { status });
}

export async function deleteRule(ruleId: string) {
  await deleteDoc(doc(db, 'rules', ruleId));
}

// ---- automation logs ----

export function subscribeToAutomationLogs(
  ownerUid: string,
  callback: (logs: AutomationLog[]) => void
) {
  const q = query(
    collection(db, 'automationLogs'),
    where('ownerUid', '==', ownerUid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...data, createdAt: toMillis(data.createdAt) } as unknown as AutomationLog;
      })
    );
  });
}

// ---- subscription (mirrors RevenueCat entitlement state) ----

export function subscribeToSubscription(
  uid: string,
  callback: (subscription: Subscription | null) => void
) {
  return onSnapshot(doc(db, 'subscriptions', uid), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    const data = snapshot.data();
    callback({
      tier: data.tier ?? 'free',
      entitlementActive: !!data.entitlementActive,
      freePostUsed: !!data.freePostUsed,
      revenueCatCustomerId: data.revenueCatCustomerId ?? null,
      expiresAt: data.expiresAt ? toMillis(data.expiresAt) : null,
      updatedAt: toMillis(data.updatedAt),
    });
  });
}

export async function markFreePostUsed(uid: string) {
  await setDoc(doc(db, 'subscriptions', uid), { freePostUsed: true }, { merge: true });
}

// ---- conversations (manual inbox) ----

export function subscribeToConversations(
  ownerUid: string,
  callback: (conversations: Conversation[]) => void
) {
  const q = query(
    collection(db, 'conversations'),
    where('ownerUid', '==', ownerUid),
    orderBy('lastInteractionAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerUid: data.ownerUid,
          igAccountId: data.igAccountId,
          ruleId: data.ruleId ?? null,
          commenterIgId: data.commenterIgId,
          commenterUsername: data.commenterUsername,
          currentNodeId: data.currentNodeId ?? null,
          status: data.status,
          referralSource: data.referralSource ?? null,
          lastSeenAt: data.lastSeenAt ? toMillis(data.lastSeenAt) : null,
          lastInteractionAt: toMillis(data.lastInteractionAt),
          tags: data.tags ?? [],
        } as Conversation;
      })
    );
  });
}

export function subscribeToConversationMessages(
  conversationId: string,
  callback: (messages: ConversationMessage[]) => void
) {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          direction: data.direction,
          text: data.text,
          createdAt: toMillis(data.createdAt),
        } as ConversationMessage;
      })
    );
  });
}

export async function addConversationTag(conversationId: string, tag: string) {
  await updateDoc(doc(db, 'conversations', conversationId), { tags: arrayUnion(tag) });
}

export async function removeConversationTag(conversationId: string, tag: string) {
  await updateDoc(doc(db, 'conversations', conversationId), { tags: arrayRemove(tag) });
}

// ---- broadcasts ----

export function subscribeToBroadcasts(ownerUid: string, callback: (broadcasts: Broadcast[]) => void) {
  const q = query(
    collection(db, 'broadcasts'),
    where('ownerUid', '==', ownerUid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...data, createdAt: toMillis(data.createdAt) } as unknown as Broadcast;
      })
    );
  });
}
