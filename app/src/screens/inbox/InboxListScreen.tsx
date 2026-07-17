import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { colors, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../store/AuthContext';
import { subscribeToConversations } from '../../services/firestore';
import { Conversation } from '../../types/models';
import { InboxStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<InboxStackParamList, 'InboxList'>;

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function InboxListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToConversations(user.uid, setConversations);
  }, [user]);

  return (
    <Screen scroll={false} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('inbox.title')}</Text>
        <Button label={t('inbox.broadcast')} variant="secondary" onPress={() => navigation.navigate('Broadcast')} />
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState icon="💬" message={t('inbox.emptyState')} />}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).springify()}>
            <Pressable
              onPress={() =>
                navigation.navigate('InboxThread', {
                  conversationId: item.id,
                  igAccountId: item.igAccountId,
                  recipientUserId: item.commenterIgId,
                  commenterUsername: item.commenterUsername,
                })
              }
            >
              <Card style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.username}>@{item.commenterUsername}</Text>
                  <Text style={styles.time}>{formatTime(item.lastInteractionAt)}</Text>
                </View>
                {item.tags.length > 0 && (
                  <View style={styles.tagRow}>
                    {item.tags.map((tag) => (
                      <View key={tag} style={styles.tagChip}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </Pressable>
          </Animated.View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
  title: { ...typography.h1, color: colors.text },
  listContent: { paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  username: { ...typography.bodyBold, color: colors.text },
  time: { ...typography.caption, color: colors.textMuted },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  tagText: { ...typography.caption, color: colors.primaryDark },
});
