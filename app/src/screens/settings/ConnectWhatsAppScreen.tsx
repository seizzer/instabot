import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { colors, spacing, typography } from '../../theme/theme';
import { connectWhatsAppAccount, exchangeWhatsAppEmbeddedSignupCode } from '../../services/functions';
import { SettingsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SettingsStackParamList, 'ConnectWhatsApp'>;

const SIGNUP_URL = (() => {
  const appId = process.env.EXPO_PUBLIC_META_APP_ID ?? '';
  const configId = process.env.EXPO_PUBLIC_META_WHATSAPP_CONFIG_ID ?? '';
  return `https://instabot-app-tr.web.app/whatsapp-embedded-signup.html?appId=${encodeURIComponent(
    appId
  )}&configId=${encodeURIComponent(configId)}`;
})();

interface SignupMessage {
  code: string | null;
  wabaId: string | null;
  phoneNumberId: string | null;
}

export function ConnectWhatsAppScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [connecting, setConnecting] = useState(false);
  const [showManual, setShowManual] = useState(false);

  // Kept as a fallback for testing before EXPO_PUBLIC_META_WHATSAPP_CONFIG_ID
  // is set up, or if Embedded Signup's App Review approval is still pending
  // (see META_SETUP.md §10) — the customer-facing path is the WebView above.
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const handleSignupMessage = async (raw: string) => {
    let data: SignupMessage;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    if (!data.code || !data.wabaId || !data.phoneNumberId) return;

    setConnecting(true);
    try {
      const { data: result } = await exchangeWhatsAppEmbeddedSignupCode({
        code: data.code,
        wabaId: data.wabaId,
        phoneNumberId: data.phoneNumberId,
      });
      Alert.alert(
        t('common.done') ?? '',
        t('settings.whatsAppConnected', { phoneNumber: result.displayPhoneNumber }) ?? ''
      );
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common.error') ?? '', error.message ?? '');
    } finally {
      setConnecting(false);
    }
  };

  const handleManualConnect = async () => {
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

  if (showManual) {
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
          autoCorrect={false}
          multiline
        />

        <Button
          label={t('settings.connectWhatsAppButton')}
          onPress={handleManualConnect}
          loading={connecting}
          disabled={!phoneNumberId.trim() || !wabaId.trim() || !accessToken.trim()}
          style={styles.connectButton}
        />
        <Text style={styles.switchModeLink} onPress={() => setShowManual(false)}>
          {t('settings.whatsAppUseEmbeddedSignup')}
        </Text>
      </Screen>
    );
  }

  return (
    <View style={styles.webviewContainer}>
      {connecting && (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}
      <WebView
        source={{ uri: SIGNUP_URL }}
        onMessage={(event) => handleSignupMessage(event.nativeEvent.data)}
        style={styles.webview}
      />
      <Text style={styles.switchModeLink} onPress={() => setShowManual(true)}>
        {t('settings.whatsAppUseManualEntry')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  connectButton: { marginTop: spacing.md },
  webviewContainer: { flex: 1, backgroundColor: '#161512' },
  webview: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22,21,18,0.85)',
  },
  switchModeLink: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
