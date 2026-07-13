import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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

export function subscribeToRules(ownerUid: string, callback: (rules: Rule[]) => void) {
  const q = query(
    collection(db, 'rules'),
    where('ownerUid', '==', ownerUid),
    orderBy('priority', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...data } as unknown as Rule;
      })
    );
  });
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
