import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../store/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { VerifyEmailScreen } from '../screens/auth/VerifyEmailScreen';
import { colors } from '../theme/theme';

export function RootNavigator() {
  const { user, profile, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // Only email/password signups need this — Google/Apple/Facebook already
  // hand us a provider-verified email, and phone sign-in has no email at all.
  const needsEmailVerification =
    !!user &&
    user.providerData.some((p) => p.providerId === 'password') &&
    !user.emailVerified;

  return (
    <NavigationContainer>
      {!user ? (
        <AuthNavigator />
      ) : needsEmailVerification ? (
        <VerifyEmailScreen />
      ) : !profile?.onboardingCompleted ? (
        <OnboardingNavigator />
      ) : (
        <MainTabNavigator />
      )}
    </NavigationContainer>
  );
}
