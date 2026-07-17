import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { MainTabParamList } from './types';
import { HomeScreen } from '../screens/home/HomeScreen';
import { RulesNavigator } from './RulesNavigator';
import { InboxNavigator } from './InboxNavigator';
import { TemplatesScreen } from '../screens/templates/TemplatesScreen';
import { LogsScreen } from '../screens/logs/LogsScreen';
import { SettingsNavigator } from './SettingsNavigator';
import { colors, glass } from '../theme/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  HomeTab: 'home',
  RulesTab: 'flash',
  InboxTab: 'chatbubbles',
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
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView intensity={glass.blurIntensity} tint="light" style={StyleSheet.absoluteFill} />
        ),
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name as keyof MainTabParamList]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: t('home.title') }} />
      <Tab.Screen name="RulesTab" component={RulesNavigator} options={{ title: t('rules.title') }} />
      <Tab.Screen name="InboxTab" component={InboxNavigator} options={{ title: t('inbox.title') }} />
      <Tab.Screen
        name="TemplatesTab"
        component={TemplatesScreen}
        options={{ title: t('templates.title') }}
      />
      <Tab.Screen name="LogsTab" component={LogsScreen} options={{ title: t('logs.title') }} />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsNavigator}
        options={{ title: t('settings.title'), headerShown: false }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    // Deliberately NOT position:absolute — that would require every screen
    // to add bottom padding for the bar height (via useBottomTabBarHeight)
    // to avoid clipped content. Kept in normal flow; still gets the
    // translucent blur tint via tabBarBackground.
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: glass.border,
    elevation: 0,
  },
});
