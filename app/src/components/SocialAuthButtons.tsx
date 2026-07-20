import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { Ionicons } from '@expo/vector-icons';
import {
  isAppleSignInAvailable,
  isFacebookSignInAvailable,
  isGoogleSignInAvailable,
  signInWithApple,
  signInWithFacebook,
  signInWithGoogle,
} from '../services/socialAuth';
import { SupportedLanguage } from '../i18n';
import { getAuthErrorMessage } from '../utils/authErrors';
import { colors, radius, spacing, typography } from '../theme/theme';

export function SocialAuthButtons() {
  const { t, i18n } = useTranslation();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const locale = (i18n.language as SupportedLanguage) ?? 'tr';

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const googleAvailable = isGoogleSignInAvailable();
  const facebookAvailable = isFacebookSignInAvailable();
  if (!googleAvailable && !appleAvailable && !facebookAvailable) return null;

  const handleError = (error: any) => {
    if (
      error?.code === 'ERR_REQUEST_CANCELED' ||
      error?.code === '-5' ||
      error?.message === 'Facebook ile giriş iptal edildi.'
    ) {
      return;
    }
    Alert.alert(t('common.error') ?? '', getAuthErrorMessage(error, t));
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

      {facebookAvailable && (
        <Pressable
          style={styles.facebookButton}
          onPress={() => signInWithFacebook(locale).catch(handleError)}
        >
          <Ionicons name="logo-facebook" size={20} color={colors.textInverse} />
          <Text style={styles.facebookButtonText}>{t('auth.continueWithFacebook')}</Text>
        </Pressable>
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
  facebookButton: {
    width: '100%',
    height: 52,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.facebook,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  facebookButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
});
