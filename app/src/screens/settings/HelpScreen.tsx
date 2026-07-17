import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { colors, spacing, typography } from '../../theme/theme';

const SUPPORT_EMAIL = 'destek@instabot.app';

const FAQ_KEYS = [
  'faqDmWindow',
  'faqPrivateReplyFailed',
  'faqFreemium',
  'faqButtonLimit',
  'faqInstagramReconnect',
  'faqAbTest',
  'faqDelayedMessage',
  'faqBroadcastWindow',
] as const;

export function HelpScreen() {
  const { t } = useTranslation();
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <Screen>
      <Text style={styles.title}>{t('help.title')}</Text>
      <Text style={styles.subtitle}>{t('help.subtitle')}</Text>

      <Card style={styles.card}>
        {FAQ_KEYS.map((key) => {
          const isOpen = openKey === key;
          return (
            <View key={key} style={styles.faqItem}>
              <Pressable onPress={() => setOpenKey(isOpen ? null : key)}>
                <Text style={styles.question}>{t(`help.${key}Q`)}</Text>
              </Pressable>
              {isOpen && <Text style={styles.answer}>{t(`help.${key}A`)}</Text>}
            </View>
          );
        })}
      </Card>

      <Pressable
        style={styles.contactRow}
        onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
      >
        <Text style={styles.contactText}>{t('help.contactSupport')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  card: { marginBottom: spacing.lg },
  faqItem: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  question: { ...typography.bodyBold, color: colors.text },
  answer: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  contactRow: { paddingVertical: spacing.md, alignItems: 'center' },
  contactText: { ...typography.bodyBold, color: colors.primary },
});
