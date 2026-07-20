import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { colors, spacing, typography } from '../../theme/theme';
import { resetPassword } from '../../services/auth';
import { getAuthErrorMessage } from '../../utils/authErrors';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendResetLink = async () => {
    setLoading(true);
    try {
      await resetPassword(email.trim());
      Alert.alert(t('common.done') ?? '', t('auth.resetEmailSent') ?? '', [
        { text: t('common.done') ?? '', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert(t('common.error') ?? '', getAuthErrorMessage(error, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('auth.forgotPasswordTitle')}</Text>
      <Text style={styles.subtitle}>{t('auth.forgotPasswordSubtitle')}</Text>
      <View style={styles.form}>
        <TextField
          label={t('auth.email') ?? undefined}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Button label={t('auth.sendResetLinkButton')} onPress={handleSendResetLink} loading={loading} />
      </View>

      <Text style={styles.backLink} onPress={() => navigation.goBack()}>
        {t('auth.backToLogin')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  form: { marginBottom: spacing.lg },
  backLink: {
    ...typography.bodyBold,
    color: colors.primary,
    textAlign: 'center',
  },
});
