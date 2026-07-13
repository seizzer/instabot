import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import {
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
  signInWithApple,
  signInWithGoogle,
} from '../services/socialAuth';
import { SupportedLanguage } from '../i18n';
import { colors, spacing, typography } from '../theme/theme';

export function SocialAuthButtons() {
  const { t, i18n } = useTranslation();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const locale = (i18n.language as SupportedLanguage) ?? 'tr';

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const googleAvailable = isGoogleSignInAvailable();
  if (!googleAvailable && !appleAvailable) return null;

  const handleError = (error: any) => {
    if (error?.code === 'ERR_REQUEST_CANCELED' || error?.code === '-5') return;
    Alert.alert(t('common.error') ?? '', error?.message ?? '');
  };

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
        <View style={styles.dividerLine} />
      </View>

      {googleAvailable && (
        <GoogleSigninButton
          style={styles.googleButton}
          size={GoogleSigninButton.Size.Wide}
          onPress={() => signInWithGoogle(locale).catch(handleError)}
        />
      )}

      {appleAvailable && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={14}
          style={styles.appleButton}
          onPress={() => signInWithApple(locale).catch(handleError)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.lg },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: spacing.sm,
  },
  googleButton: { width: '100%', height: 52, marginBottom: spacing.sm },
  appleButton: { width: '100%', height: 52 },
});
