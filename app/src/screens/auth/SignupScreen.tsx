import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { SocialAuthButtons } from '../../components/SocialAuthButtons';
import { colors, spacing, typography } from '../../theme/theme';
import { signUpWithEmail } from '../../services/auth';
import { isPasswordValid } from '../../utils/passwordPolicy';
import { AuthStackParamList } from '../../navigation/types';
import { SupportedLanguage } from '../../i18n';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!isPasswordValid(password)) {
      Alert.alert(t('common.error') ?? '', t('auth.passwordRequirements') ?? '');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.error') ?? '', t('auth.passwordMismatch') ?? '');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, (i18n.language as SupportedLanguage) ?? 'tr');
    } catch (error: any) {
      Alert.alert(t('common.error') ?? '', error.message ?? '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Image source={require('../../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>{t('auth.signupTitle')}</Text>
      <View style={styles.form}>
        <TextField
          label={t('auth.email') ?? undefined}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextField
          label={t('auth.password') ?? undefined}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Text style={styles.hint}>{t('auth.passwordRequirements')}</Text>
        <TextField
          label={t('auth.confirmPassword') ?? undefined}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <Button label={t('auth.signupButton')} onPress={handleSignup} loading={loading} />
      </View>

      <SocialAuthButtons />

      <Text style={styles.phoneLink} onPress={() => navigation.navigate('PhoneLogin')}>
        {t('auth.continueWithPhone')}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>{t('auth.haveAccount')} </Text>
        <Text style={styles.footerLink} onPress={() => navigation.navigate('Login')}>
          {t('auth.loginInstead')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { width: 96, height: 96, alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg, textAlign: 'center' },
  form: { marginBottom: spacing.lg },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: -spacing.sm, marginBottom: spacing.md },
  phoneLink: {
    ...typography.bodyBold,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { ...typography.body, color: colors.textMuted },
  footerLink: { ...typography.bodyBold, color: colors.primary },
});
