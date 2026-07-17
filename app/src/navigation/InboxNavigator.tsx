import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { InboxStackParamList } from './types';
import { InboxListScreen } from '../screens/inbox/InboxListScreen';
import { InboxThreadScreen } from '../screens/inbox/InboxThreadScreen';
import { BroadcastScreen } from '../screens/inbox/BroadcastScreen';
import { colors } from '../theme/theme';

const Stack = createNativeStackNavigator<InboxStackParamList>();

export function InboxNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: colors.primary }}>
      <Stack.Screen name="InboxList" component={InboxListScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="InboxThread"
        component={InboxThreadScreen}
        options={({ route }) => ({ title: `@${route.params.commenterUsername}` })}
      />
      <Stack.Screen
        name="Broadcast"
        component={BroadcastScreen}
        options={{ title: t('inbox.broadcast') }}
      />
    </Stack.Navigator>
  );
}
