export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type OnboardingStackParamList = {
  ConnectInstagram: undefined;
  ConnectionSuccess: { igUsername: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  RulesTab: undefined;
  TemplatesTab: undefined;
  LogsTab: undefined;
  SettingsTab: undefined;
};

export type RulesStackParamList = {
  RulesList: undefined;
  RuleWizard: { ruleId?: string };
  Paywall: undefined;
};
