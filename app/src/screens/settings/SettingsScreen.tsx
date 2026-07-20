import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { colors, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../store/AuthContext';
import {
  changePassword,
  logOut,
  resendVerificationEmail,
  setNotificationsEnabled,
  updateDisplayName,
} from '../../services/auth';
import { isPasswordValid } from '../../utils/passwordPolicy';
import { getAuthErrorMessage } from '../../utils/authErrors';
import { deleteMyAccount, exchangeInstagramCode } from '../../services/functions';
import { subscribeToIgAccounts, subscribeToWhatsAppAccounts } from '../../services/firestore';
import { connectInstagramAccount } from '../../services/instagramAuth';
import { changeLanguage, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../i18n';
import { IgAccount, WhatsAppAccount } from '../../types/models';

const PRIVACY_URL = 'https://chatterly.live/privacy.html';
const TERMS_URL = 'https://chatterly.live/terms.html';
const DATA_DELETION_URL = 'https://chatterly.live/data-deletion.html';

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { user, profile, subscription, refreshProfile } = useAuth();
  const [igAccounts, setIgAccounts] = useState<IgAccount[]>([]);
  const [whatsAppAccounts, setWhatsAppAccounts] = useState<WhatsAppAccount[]>([]);
  const [reconnecting, setReconnecting] = useState(false);

  const isPasswordUser = user?.providerData.some((p) => p.providerId === 'password') ?? false;

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  useEffect(() => {
    setDisplayName(profile?.displayName ?? '');
  }, [profile?.displayName]);

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeToIgAccounts(user.uid, setIgAccounts);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeToWhatsAppAccounts(user.uid, setWhatsAppAccounts);
  }, [user]);

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      const { authorizationCode, redirectUri } = await connectInstagramAccount();
      await exchangeInstagramCode({ authorizationCode, redirectUri });
    } catch (error) {
      Alert.alert(t('common.error') ?? '', getAuthErrorMessage(error, t));
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

  const handleSaveDisplayName = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await updateDisplayName(user.uid, displayName.trim());
      await refreshProfile();
    } catch (error) {
      Alert.alert(t('common.error') ?? '', getAuthErrorMessage(error, t));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    if (!isPasswordValid(newPassword)) {
      Alert.alert(t('common.error') ?? '', t('auth.passwordRequirements') ?? '');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert(t('common.error') ?? '', t('auth.passwordMismatch') ?? '');
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(user.email, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordChange(false);
      Alert.alert(t('common.done') ?? '');
    } catch (error) {
      Alert.alert(t('common.error') ?? '', getAuthErrorMessage(error, t));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      await resendVerificationEmail();
      Alert.alert(t('common.done') ?? '', t('auth.verificationSent') ?? '');
    } catch (error) {
      Alert.alert(t('common.error') ?? '', getAuthErrorMessage(error, t));
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('settings.title')}</Text>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>{t('settings.account')}</Text>
        <Text style={styles.value}>{profile?.email}</Text>

        {isPasswordUser && (
          <View style={styles.verifyRow}>
            {user?.emailVerified ? (
              <Text style={styles.accountStatusOk}>{t('settings.emailVerified')}</Text>
            ) : (
              <Pressable onPress={handleResendVerification} disabled={resendingVerification}>
                <Text style={styles.accountStatusBad}>
                  {resendingVerification ? '…' : t('settings.emailNotVerified')}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <Text style={[styles.sectionLabel, styles.fieldSpacing]}>
          {t('settings.displayNameLabel')}
        </Text>
        <TextField value={displayName} onChangeText={setDisplayName} placeholder={t('settings.displayNameLabel') ?? undefined} />
        <Button
          label={t('settings.save')}
          variant="secondary"
          onPress={handleSaveDisplayName}
          loading={savingProfile}
        />

        {isPasswordUser && (
          <>
            <Pressable
              style={styles.changePasswordToggle}
              onPress={() => setShowPasswordChange((v) => !v)}
            >
              <Text style={styles.rowActionText}>{t('settings.changePassword')}</Text>
            </Pressable>
            {showPasswordChange && (
              <View style={styles.passwordForm}>
                <TextField
                  label={t('settings.currentPassword') ?? undefined}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />
                <TextField
                  label={t('settings.newPassword') ?? undefined}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <Text style={styles.hint}>{t('auth.passwordRequirements')}</Text>
                <TextField
                  label={t('settings.confirmNewPassword') ?? undefined}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  secureTextEntry
                />
                <Button
                  label={t('settings.save')}
                  onPress={handleChangePassword}
                  loading={changingPassword}
                />
              </View>
            )}
          </>
        )}
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
        <Text style={styles.sectionLabel}>{t('settings.connectedWhatsAppAccounts')}</Text>
        {whatsAppAccounts.length === 0 ? (
          <Text style={styles.value}>—</Text>
        ) : (
          whatsAppAccounts.map((account) => (
            <View key={account.id} style={styles.accountRow}>
              <Text style={styles.value}>{account.displayPhoneNumber}</Text>
              {account.status === 'active' && <Text style={styles.accountStatusOk}>●</Text>}
            </View>
          ))
        )}
        <Button
          label={t('settings.connectWhatsAppButton')}
          variant="ghost"
          onPress={() => navigation.navigate('ConnectWhatsApp')}
          style={styles.upgradeButton}
        />
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

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>{t('settings.legal')}</Text>
        <Pressable style={styles.legalRow} onPress={() => Linking.openURL(PRIVACY_URL)}>
          <Text style={styles.rowActionText}>{t('settings.privacyPolicy')}</Text>
        </Pressable>
        <Pressable style={styles.legalRow} onPress={() => Linking.openURL(TERMS_URL)}>
          <Text style={styles.rowActionText}>{t('settings.termsOfService')}</Text>
        </Pressable>
        <Pressable style={styles.legalRow} onPress={() => Linking.openURL(DATA_DELETION_URL)}>
          <Text style={styles.rowActionText}>{t('settings.dataDeletion')}</Text>
        </Pressable>
      </Card>

      <Pressable style={styles.rowAction} onPress={() => navigation.navigate('Help')}>
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
  fieldSpacing: { marginTop: spacing.md },
  value: { ...typography.bodyBold, color: colors.text },
  verifyRow: { marginTop: spacing.xs },
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
  changePasswordToggle: { paddingVertical: spacing.md },
  passwordForm: { marginTop: spacing.xs },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: -spacing.sm, marginBottom: spacing.md },
  legalRow: { paddingVertical: spacing.sm },
  rowAction: { paddingVertical: spacing.md, alignItems: 'center' },
  rowActionText: { ...typography.bodyBold, color: colors.text },
  rowActionDanger: { ...typography.bodyBold, color: colors.danger },
});
