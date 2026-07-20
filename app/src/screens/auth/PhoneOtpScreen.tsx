import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { colors, spacing, typography } from '../../theme/theme';
import { confirmPhoneOtp, sendPhoneOtp } from '../../services/phoneAuth';
import { getAuthErrorMessage } from '../../utils/authErrors';
import { AuthStackParamList } from '../../navigation/types';
import { SupportedLanguage } from '../../i18n';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneOtp'>;

export function PhoneOtpScreen({ route }: Props) {
  const { phoneNumber } = route.params;
  const { t, i18n } = useTranslation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      await confirmPhoneOtp(code.trim(), (i18n.language as SupportedLanguage) ?? 'tr');
    } catch (error) {
      Alert.alert(t('common.error') ?? '', getAuthErrorMessage(error, t));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await sendPhoneOtp(phoneNumber);
    } catch (error) {
      Alert.alert(t('common.error') ?? '', getAuthErrorMessage(error, t));
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('auth.otpTitle')}</Text>
      <Text style={styles.subtitle}>{t('auth.otpSubtitle', { phoneNumber })}</Text>
      <View style={styles.form}>
        <TextField
          label={t('auth.otpCodeLabel') ?? undefined}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
        />
        <Button label={t('auth.verifyCodeButton')} onPress={handleVerify} loading={loading} />
        <Text style={styles.resendLink} onPress={handleResend}>
          {resending ? '…' : t('auth.resendCode')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  form: { marginBottom: spacing.lg },
  resendLink: {
    ...typography.bodyBold,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
