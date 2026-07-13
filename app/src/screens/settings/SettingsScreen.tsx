import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { colors, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../store/AuthContext';
import { logOut, setNotificationsEnabled } from '../../services/auth';
import { deleteMyAccount, exchangeInstagramCode } from '../../services/functions';
import { subscribeToIgAccounts } from '../../services/firestore';
import { connectInstagramAccount } from '../../services/instagramAuth';
import { changeLanguage, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../i18n';
import { IgAccount } from '../../types/models';

const SUPPORT_EMAIL = 'destek@instabot.app';

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { user, profile, subscription, refreshProfile } = useAuth();
  const [igAccounts, setIgAccounts] = useState<IgAccount[]>([]);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeToIgAccounts(user.uid, setIgAccounts);
  }, [user]);

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      const { authorizationCode, redirectUri } = await connectInstagramAccount();
      await exchangeInstagramCode({ authorizationCode, redirectUri });
    } catch (error: any) {
      Alert.alert(t('common.error') ?? '', error.message ?? '');
    } finally {
      setReconnecting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('settings.deleteAccount'), 'Bu işlem geri alınamaz. Emin misin?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteMyAccount(),
      },
    ]);
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!user) return;
    await setNotificationsEnabled(user.uid, enabled);
    await refreshProfile();
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('settings.title')}</Text>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>{t('settings.account')}</Text>
        <Text style={styles.value}>{profile?.email}</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>{t('settings.connectedAccounts')}</Text>
        {igAccounts.length === 0 ? (
          <Text style={styles.value}>—</Text>
        ) : (
          igAccounts.map((account) => (
            <View key={account.id} style={styles.accountRow}>
              <Text style={styles.value}>@{account.igUsername}</Text>
              {account.status === 'active' ? (
                <Text style={styles.accountStatusOk}>●</Text>
              ) : (
                <Pressable onPress={handleReconnect} disabled={reconnecting}>
                  <Text style={styles.accountStatusBad}>
                    ⚠ {reconnecting ? '…' : 'Yeniden bağlan'}
                  </Text>
                </Pressable>
              )}
            </View>
          ))
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>{t('settings.subscription')}</Text>
        <Text style={styles.value}>{subscription?.tier === 'pro' ? 'Pro' : 'Ücretsiz'}</Text>
        {subscription?.tier !== 'pro' && (
          <Button
            label={t('paywall.title')}
            onPress={() => navigation.navigate('RulesTab', { screen: 'Paywall' })}
            style={styles.upgradeButton}
          />
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>{t('settings.language')}</Text>
        <View style={styles.languageRow}>
          {SUPPORTED_LANGUAGES.map((lang: SupportedLanguage) => (
            <Pressable
              key={lang}
              onPress={() => changeLanguage(lang)}
              style={[styles.langChip, i18n.language === lang && styles.langChipActive]}
            >
              <Text style={[styles.langText, i18n.language === lang && styles.langTextActive]}>
                {lang.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={[styles.card, styles.notificationsCard]}>
        <Text style={styles.sectionLabel}>{t('settings.notifications')}</Text>
        <Switch
          value={profile?.notificationsEnabled ?? true}
          onValueChange={handleToggleNotifications}
          trackColor={{ true: colors.primary, false: colors.disabled }}
        />
      </Card>

      <Pressable
        style={styles.rowAction}
        onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
      >
        <Text style={styles.rowActionText}>{t('settings.help')}</Text>
      </Pressable>

      <Pressable style={styles.rowAction} onPress={() => logOut()}>
        <Text style={styles.rowActionText}>{t('settings.logout')}</Text>
      </Pressable>

      <Pressable style={styles.rowAction} onPress={handleDeleteAccount}>
        <Text style={styles.rowActionDanger}>{t('settings.deleteAccount')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  sectionLabel: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  value: { ...typography.bodyBold, color: colors.text },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  accountStatusOk: { color: colors.success },
  accountStatusBad: { color: colors.warning },
  upgradeButton: { marginTop: spacing.sm },
  notificationsCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  languageRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  langChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
  },
  langChipActive: { backgroundColor: colors.primary },
  langText: { color: colors.textMuted, fontWeight: '600' },
  langTextActive: { color: colors.textInverse },
  rowAction: { paddingVertical: spacing.md, alignItems: 'center' },
  rowActionText: { ...typography.bodyBold, color: colors.text },
  rowActionDanger: { ...typography.bodyBold, color: colors.danger },
});
