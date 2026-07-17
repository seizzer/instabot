import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { colors, spacing, typography } from '../../theme/theme';
import { sendPhoneOtp } from '../../services/phoneAuth';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneLogin'>;

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function PhoneLoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState('+90');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    const trimmed = phoneNumber.trim();
    if (!E164_PATTERN.test(trimmed)) {
      Alert.alert(t('common.error') ?? '', t('auth.invalidPhoneNumber') ?? '');
      return;
    }
    setLoading(true);
    try {
      await sendPhoneOtp(trimmed);
      navigation.navigate('PhoneOtp', { phoneNumber: trimmed });
    } catch (error: any) {
      Alert.alert(t('common.error') ?? '', error.message ?? '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('auth.continueWithPhone')}</Text>
      <View style={styles.form}>
        <TextField
          label={t('auth.phoneNumberLabel') ?? undefined}
          placeholder={t('auth.phoneNumberPlaceholder') ?? undefined}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
        <Button label={t('auth.sendCodeButton')} onPress={handleSendCode} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  form: { marginBottom: spacing.lg },
});
