import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { colors, spacing, typography } from '../../theme/theme';
import { connectWhatsAppAccount } from '../../services/functions';
import { SettingsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SettingsStackParamList, 'ConnectWhatsApp'>;

export function ConnectWhatsAppScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!phoneNumberId.trim() || !wabaId.trim() || !accessToken.trim()) return;
    setConnecting(true);
    try {
      const { data } = await connectWhatsAppAccount({
        phoneNumberId: phoneNumberId.trim(),
        wabaId: wabaId.trim(),
        accessToken: accessToken.trim(),
      });
      Alert.alert(
        t('common.done') ?? '',
        t('settings.whatsAppConnected', { phoneNumber: data.displayPhoneNumber }) ?? ''
      );
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common.error') ?? '', error.message ?? '');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('settings.connectWhatsAppTitle')}</Text>
      <Text style={styles.subtitle}>{t('settings.connectWhatsAppSubtitle')}</Text>

      <TextField
        label={t('settings.whatsAppPhoneNumberIdLabel') ?? undefined}
        value={phoneNumberId}
        onChangeText={setPhoneNumberId}
        autoCapitalize="none"
      />
      <TextField
        label={t('settings.whatsAppWabaIdLabel') ?? undefined}
        value={wabaId}
        onChangeText={setWabaId}
        autoCapitalize="none"
      />
      <TextField
        label={t('settings.whatsAppAccessTokenLabel') ?? undefined}
        value={accessToken}
        onChangeText={setAccessToken}
        autoCapitalize="none"
        secureTextEntry
        multiline
      />

      <Button
        label={t('settings.connectWhatsAppButton')}
        onPress={handleConnect}
        loading={connecting}
        disabled={!phoneNumberId.trim() || !wabaId.trim() || !accessToken.trim()}
        style={styles.connectButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  connectButton: { marginTop: spacing.md },
});
