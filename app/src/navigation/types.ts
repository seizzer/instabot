export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  PhoneLogin: undefined;
  PhoneOtp: { phoneNumber: string };
};

export type OnboardingStackParamList = {
  ConnectInstagram: undefined;
  ConnectionSuccess: { igUsername: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  RulesTab: undefined;
  InboxTab: undefined;
  LogsTab: undefined;
  SettingsTab: undefined;
};

export type RulesStackParamList = {
  RulesList: undefined;
  NewRuleType: undefined;
  RuleWizard: { ruleId?: string };
  SimpleTriggerRule: {
    triggerType: 'mention' | 'reaction' | 'story_mention' | 'story_reply';
    ruleId?: string;
  };
  WhatsAppRule: { ruleId?: string };
  Paywall: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  Help: undefined;
  ConnectWhatsApp: undefined;
};

export type InboxStackParamList = {
  InboxList: undefined;
  InboxThread: {
    conversationId: string;
    igAccountId: string;
    recipientUserId: string;
    commenterUsername: string;
  };
  Broadcast: undefined;
};
