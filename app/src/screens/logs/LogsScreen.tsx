import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { colors, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../store/AuthContext';
import { subscribeToAutomationLogs } from '../../services/firestore';
import { AutomationLog } from '../../types/models';

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function LogsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [logs, setLogs] = useState<AutomationLog[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToAutomationLogs(user.uid, setLogs);
  }, [user]);

  return (
    <Screen scroll={false} style={styles.screen}>
      <Text style={styles.title}>{t('logs.title')}</Text>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState icon="📋" message={t('logs.emptyState')} />}
        renderItem={({ item }) => (
          <Card style={styles.logCard}>
            <View style={styles.logHeaderRow}>
              <Text style={styles.logType}>
                {item.eventType === 'button_click' ? t('logs.buttonClick') : t('logs.commentMatch')}
              </Text>
              <Text style={styles.logTime}>{formatTime(item.createdAt)}</Text>
            </View>
            {item.commentText ? <Text style={styles.logComment}>“{item.commentText}”</Text> : null}
            <Text style={styles.logCommenter}>@{item.commenterUsername}</Text>
            <Text style={item.dmSent ? styles.logSuccess : styles.logError}>
              {item.dmSent ? t('logs.dmSent') : item.dmError ? t('logs.dmFailed') : ''}
            </Text>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.md },
  logCard: { marginBottom: spacing.sm },
  logHeaderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  logType: { ...typography.bodyBold, color: colors.text },
  logTime: { ...typography.caption, color: colors.textMuted },
  logComment: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, fontStyle: 'italic' },
  logCommenter: { ...typography.caption, color: colors.text, marginTop: spacing.xs },
  logSuccess: { ...typography.caption, color: colors.success, marginTop: spacing.xs },
  logError: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
});
