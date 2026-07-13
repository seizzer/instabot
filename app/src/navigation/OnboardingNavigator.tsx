import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import { ConnectInstagramScreen } from '../screens/onboarding/ConnectInstagramScreen';
import { ConnectionSuccessScreen } from '../screens/onboarding/ConnectionSuccessScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConnectInstagram" component={ConnectInstagramScreen} />
      <Stack.Screen name="ConnectionSuccess" component={ConnectionSuccessScreen} />
    </Stack.Navigator>
  );
}
