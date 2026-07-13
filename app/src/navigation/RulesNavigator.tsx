import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RulesStackParamList } from './types';
import { RulesListScreen } from '../screens/rules/RulesListScreen';
import { RuleWizardScreen } from '../screens/rules/RuleWizardScreen';
import { PaywallScreen } from '../screens/paywall/PaywallScreen';
import { colors } from '../theme/theme';

const Stack = createNativeStackNavigator<RulesStackParamList>();

export function RulesNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: colors.primary }}>
      <Stack.Screen name="RulesList" component={RulesListScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="RuleWizard"
        component={RuleWizardScreen}
        options={({ route }) => ({
          title: route.params?.ruleId ? t('rules.editRule') : t('rules.newRule'),
        })}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ presentation: 'modal', title: '' }}
      />
    </Stack.Navigator>
  );
}
