import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { colors, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../store/AuthContext';
import { subscribeToBroadcasts, subscribeToIgAccounts } from '../../services/firestore';
import { sendBroadcast } from '../../services/functions';
import { Broadcast, IgAccount } from '../../types/models';

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function BroadcastScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [igAccounts, setIgAccounts] = useState<IgAccount[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [text, setText] = useState('');
  const [targetTag, setTargetTag] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubAccounts = subscribeToIgAccounts(user.uid, setIgAccounts);
    const unsubBroadcasts = subscribeToBroadcasts(user.uid, setBroadcasts);
    return () => {
      unsubAccounts();
      unsubBroadcasts();
    };
  }, [user]);

  const activeIgAccount = igAccounts[0] ?? null;

  const handleSend = async () => {
    if (!activeIgAccount || !text.trim()) return;
    setSending(true);
    try {
      const { data } = await sendBroadcast({
        igAccountId: activeIgAccount.id,
        text: text.trim(),
        targetTag: targetTag.trim() || null,
      });
      Alert.alert(
        t('common.done') ?? '',
        t('inbox.broadcastResult', { sent: data.sentCount, total: data.recipientCount }) ?? ''
      );
      setText('');
      setTargetTag('');
    } catch (error: any) {
      Alert.alert(t('common.error') ?? '', error.message ?? '');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen scroll={false} style={styles.screen}>
      <Text style={styles.title}>{t('inbox.broadcast')}</Text>
      <Text style={styles.subtitle}>{t('inbox.broadcastSubtitle')}</Text>

      <TextField
        label={t('inbox.broadcastMessageLabel') ?? undefined}
        value={text}
        onChangeText={setText}
        multiline
      />
      <TextField
        label={t('inbox.broadcastTagLabel') ?? undefined}
        placeholder={t('inbox.broadcastTagPlaceholder') ?? undefined}
        value={targetTag}
        onChangeText={setTargetTag}
      />
      <Button label={t('inbox.send')} onPress={handleSend} loading={sending} style={styles.sendButton} />

      <FlatList
        data={broadcasts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.historyList}
        ListHeaderComponent={<Text style={styles.historyTitle}>{t('inbox.broadcastHistory')}</Text>}
        renderItem={({ item }) => (
          <Card style={styles.historyCard}>
            <Text style={styles.historyText} numberOfLines={2}>{item.text}</Text>
            <Text style={styles.historyMeta}>
              {formatTime(item.createdAt)} · {item.sentCount}/{item.recipientCount}
            </Text>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  sendButton: { marginBottom: spacing.lg },
  historyList: { paddingBottom: spacing.xxl },
  historyTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  historyCard: { marginBottom: spacing.sm },
  historyText: { ...typography.body, color: colors.text },
  historyMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
