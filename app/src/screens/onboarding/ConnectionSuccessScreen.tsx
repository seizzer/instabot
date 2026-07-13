import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { colors, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../store/AuthContext';
import { markOnboardingCompleted } from '../../services/auth';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'ConnectionSuccess'>;

export function ConnectionSuccessScreen({ route }: Props) {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const { igUsername } = route.params;

  const handleStart = async () => {
    if (!user) return;
    await markOnboardingCompleted(user.uid);
    await refreshProfile();
    // RootNavigator switches to MainTabNavigator automatically once
    // profile.onboardingCompleted becomes true.
  };

  return (
    <Screen>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>{t('onboarding.successTitle')}</Text>
      <Text style={styles.subtitle}>
        {t('onboarding.successSubtitle', { username: igUsername })}
      </Text>
      <Button label={t('onboarding.startButton')} onPress={handleStart} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: spacing.md },
  title: { ...typography.h1, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});
