import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { MainTabParamList } from './types';
import { HomeScreen } from '../screens/home/HomeScreen';
import { RulesNavigator } from './RulesNavigator';
import { TemplatesScreen } from '../screens/templates/TemplatesScreen';
import { LogsScreen } from '../screens/logs/LogsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  HomeTab: 'home',
  RulesTab: 'flash',
  TemplatesTab: 'grid',
  LogsTab: 'list',
  SettingsTab: 'settings',
};

export function MainTabNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name as keyof MainTabParamList]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: t('home.title') }} />
      <Tab.Screen name="RulesTab" component={RulesNavigator} options={{ title: t('rules.title') }} />
      <Tab.Screen
        name="TemplatesTab"
        component={TemplatesScreen}
        options={{ title: t('templates.title') }}
      />
      <Tab.Screen name="LogsTab" component={LogsScreen} options={{ title: t('logs.title') }} />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ title: t('settings.title') }}
      />
    </Tab.Navigator>
  );
}
