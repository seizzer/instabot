import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { colors, radius, spacing, typography } from '../../theme/theme';
import {
  subscribeToConversationMessages,
  subscribeToConversations,
  addConversationTag,
  removeConversationTag,
} from '../../services/firestore';
import { sendManualMessage } from '../../services/functions';
import { useAuth } from '../../store/AuthContext';
import { ConversationMessage } from '../../types/models';
import { InboxStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<InboxStackParamList, 'InboxThread'>;

export function InboxThreadScreen({ route }: Props) {
  const { conversationId, igAccountId, recipientUserId, commenterUsername } = route.params;
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    return subscribeToConversationMessages(conversationId, setMessages);
  }, [conversationId]);

  // Reuses the list subscription (already scoped to this owner) rather than
  // a dedicated single-conversation listener — one extra small query is
  // simpler than adding a new firestore.ts function for a single doc.
  useEffect(() => {
    if (!user) return;
    return subscribeToConversations(user.uid, (all) => {
      const match = all.find((c) => c.id === conversationId);
      setTags(match?.tags ?? []);
    });
  }, [user, conversationId]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendManualMessage({ igAccountId, recipientUserId, text: text.trim() });
      setText('');
    } catch (error: any) {
      Alert.alert(t('common.error') ?? '', error.message ?? '');
    } finally {
      setSending(false);
    }
  };

  const handleAddTag = async () => {
    const tag = newTag.trim();
    if (!tag) return;
    await addConversationTag(conversationId, tag);
    setNewTag('');
  };

  return (
    <Screen scroll={false} style={styles.screen}>
      <Text style={styles.title}>@{commenterUsername}</Text>

      {tags.length > 0 && (
        <View style={styles.existingTagRow}>
          {tags.map((tag) => (
            <Pressable key={tag} onPress={() => removeConversationTag(conversationId, tag)}>
              <View style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag} ✕</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.tagRow}>
        <TextField
          value={newTag}
          onChangeText={setNewTag}
          placeholder={t('inbox.addTagPlaceholder') ?? undefined}
          style={styles.tagInput}
        />
        <Button label={t('inbox.addTag')} variant="secondary" onPress={handleAddTag} />
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.direction === 'outbound' ? styles.bubbleOutbound : styles.bubbleInbound,
            ]}
          >
            <Text style={item.direction === 'outbound' ? styles.bubbleTextOutbound : styles.bubbleTextInbound}>
              {item.text}
            </Text>
          </View>
        )}
      />

      <View style={styles.composerRow}>
        <TextField
          value={text}
          onChangeText={setText}
          placeholder={t('inbox.messagePlaceholder') ?? undefined}
          style={styles.composerInput}
        />
        <Button label={t('inbox.send')} onPress={handleSend} loading={sending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  existingTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  tagChipText: { ...typography.caption, color: colors.primaryDark },
  tagRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginBottom: spacing.sm },
  tagInput: { flex: 1 },
  messageList: { paddingBottom: spacing.md },
  bubble: { maxWidth: '80%', borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  bubbleInbound: { backgroundColor: colors.surfaceAlt, alignSelf: 'flex-start' },
  bubbleOutbound: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  bubbleTextInbound: { ...typography.body, color: colors.text },
  bubbleTextOutbound: { ...typography.body, color: colors.textInverse },
  composerRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingBottom: spacing.md },
  composerInput: { flex: 1 },
});
