import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { colors, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../store/AuthContext';
import { logOut } from '../../services/auth';
import { deleteMyAccount } from '../../services/functions';
import { changeLanguage, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../i18n';

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { profile, subscription } = useAuth();

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

  return (
    <Screen>
      <Text style={styles.title}>{t('settings.title')}</Text>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>{t('settings.account')}</Text>
        <Text style={styles.value}>{profile?.email}</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>{t('settings.subscription')}</Text>
        <Text style={styles.value}>{subscription?.tier === 'pro' ? 'Pro' : 'Ücretsiz'}</Text>
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
