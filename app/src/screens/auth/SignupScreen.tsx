import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { colors, spacing, typography } from '../../theme/theme';
import { signUpWithEmail } from '../../services/auth';
import { AuthStackParamList } from '../../navigation/types';
import { SupportedLanguage } from '../../i18n';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
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
        <Button label={t('auth.signupButton')} onPress={handleSignup} loading={loading} />
      </View>
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
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  form: { marginBottom: spacing.lg },
  footerRow: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { ...typography.body, color: colors.textMuted },
  footerLink: { ...typography.bodyBold, color: colors.primary },
});
