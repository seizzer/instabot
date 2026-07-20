import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToIgAccounts, subscribeToWhatsAppAccounts } from '../services/firestore';
import { IgAccount, WhatsAppAccount } from '../types/models';

export type ConnectedAccount =
  | { key: string; platform: 'instagram'; igAccount: IgAccount }
  | { key: string; platform: 'whatsapp'; whatsAppAccount: WhatsAppAccount };

interface ActiveAccountContextValue {
  accounts: ConnectedAccount[];
  activeAccount: ConnectedAccount | null;
  setActiveAccountKey: (key: string) => void;
}

const ActiveAccountContext = createContext<ActiveAccountContextValue>({
  accounts: [],
  activeAccount: null,
  setActiveAccountKey: () => {},
});

// Lets a user with more than one connected Instagram/WhatsApp account switch
// which one Rules/Broadcast/Inbox operate on — previously every screen just
// hardcoded igAccounts[0], so a second connected account was silently
// unreachable. Selection resets to the first account whenever the combined
// list changes shape (e.g. right after connecting a new account).
export function ActiveAccountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [igAccounts, setIgAccounts] = useState<IgAccount[]>([]);
  const [whatsAppAccounts, setWhatsAppAccounts] = useState<WhatsAppAccount[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIgAccounts([]);
      setWhatsAppAccounts([]);
      return;
    }
    const unsubIg = subscribeToIgAccounts(user.uid, setIgAccounts);
    const unsubWa = subscribeToWhatsAppAccounts(user.uid, setWhatsAppAccounts);
    return () => {
      unsubIg();
      unsubWa();
    };
  }, [user]);

  const accounts = useMemo<ConnectedAccount[]>(
    () => [
      ...igAccounts.map((igAccount) => ({
        key: `instagram:${igAccount.id}`,
        platform: 'instagram' as const,
        igAccount,
      })),
      ...whatsAppAccounts.map((whatsAppAccount) => ({
        key: `whatsapp:${whatsAppAccount.id}`,
        platform: 'whatsapp' as const,
        whatsAppAccount,
      })),
    ],
    [igAccounts, whatsAppAccounts]
  );

  useEffect(() => {
    if (accounts.length === 0) {
      setActiveKey(null);
      return;
    }
    if (!accounts.some((a) => a.key === activeKey)) {
      setActiveKey(accounts[0].key);
    }
  }, [accounts, activeKey]);

  const activeAccount = accounts.find((a) => a.key === activeKey) ?? null;

  return (
    <ActiveAccountContext.Provider
      value={{ accounts, activeAccount, setActiveAccountKey: setActiveKey }}
    >
      {children}
    </ActiveAccountContext.Provider>
  );
}

export function useActiveAccount() {
  return useContext(ActiveAccountContext);
}

// Instagram-only screens (Rules wizard, Broadcast) need an IgAccount
// specifically — if the globally active account happens to be a WhatsApp
// number (the picker spans both platforms), fall back to the first
// connected Instagram account rather than showing nothing.
export function useActiveInstagramAccount(): IgAccount | null {
  const { accounts, activeAccount } = useActiveAccount();
  if (activeAccount?.platform === 'instagram') return activeAccount.igAccount;
  const firstIg = accounts.find((a): a is Extract<ConnectedAccount, { platform: 'instagram' }> =>
    a.platform === 'instagram'
  );
  return firstIg?.igAccount ?? null;
}

export function useActiveWhatsAppAccount(): WhatsAppAccount | null {
  const { accounts, activeAccount } = useActiveAccount();
  if (activeAccount?.platform === 'whatsapp') return activeAccount.whatsAppAccount;
  const firstWa = accounts.find((a): a is Extract<ConnectedAccount, { platform: 'whatsapp' }> =>
    a.platform === 'whatsapp'
  );
  return firstWa?.whatsAppAccount ?? null;
}
