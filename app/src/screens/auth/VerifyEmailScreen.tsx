import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { colors, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../store/AuthContext';
import { logOut, resendVerificationEmail } from '../../services/auth';
import { getAuthErrorMessage } from '../../utils/authErrors';
import { auth } from '../../services/firebase';

export function VerifyEmailScreen() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationEmail();
      Alert.alert(t('common.done') ?? '', t('auth.verificationSent') ?? '');
    } catch (error) {
      Alert.alert(t('common.error') ?? '', getAuthErrorMessage(error, t));
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerified = async () => {
    setChecking(true);
    try {
      await refreshUser();
      if (!auth.currentUser?.emailVerified) {
        Alert.alert(t('common.error') ?? '', t('auth.checkVerification') ?? '');
      }
    } catch (error) {
      Alert.alert(t('common.error') ?? '', getAuthErrorMessage(error, t));
    } finally {
      setChecking(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('auth.verifyEmailTitle')}</Text>
      <Text style={styles.subtitle}>{t('auth.verifyEmailSubtitle', { email: user?.email ?? '' })}</Text>

      <View style={styles.actions}>
        <Button label={t('auth.checkVerification')} onPress={handleCheckVerified} loading={checking} />
        <Button
          label={t('auth.resendVerificationEmail')}
          variant="ghost"
          onPress={handleResend}
          loading={resending}
          style={styles.resendButton}
        />
        <Text style={styles.logoutLink} onPress={() => logOut()}>
          {t('settings.logout')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.xl },
  actions: { gap: spacing.sm },
  resendButton: { marginTop: spacing.xs },
  logoutLink: {
    ...typography.bodyBold,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
