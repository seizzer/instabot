import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { colors, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../store/AuthContext';
import { subscribeToIgAccounts, deleteRule, getRule } from '../../services/firestore';
import { createEmptyDmFlow, createEmptyRuleStats, DmFlow, IgAccount, Rule } from '../../types/models';
import { RulesStackParamList } from '../../navigation/types';
import { DmFlowStep } from './flowBuilder/DmFlowStep';
import { saveRuleWithFreemiumGate } from './ruleSaveHelpers';

type Props = NativeStackScreenProps<RulesStackParamList, 'SimpleTriggerRule'>;

export function SimpleTriggerRuleScreen({ navigation, route }: Props) {
  const { triggerType } = route.params;
  const editingRuleId = route.params.ruleId;
  const { t } = useTranslation();
  const { user, subscription } = useAuth();

  const [igAccounts, setIgAccounts] = useState<IgAccount[]>([]);
  const [name, setName] = useState('');
  const [reactionFilter, setReactionFilter] = useState('');
  const [dmFlow, setDmFlow] = useState<DmFlow>(createEmptyDmFlow());
  const [existingPriority, setExistingPriority] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingRule, setLoadingRule] = useState(!!editingRuleId);

  useEffect(() => {
    if (!user) return;
    return subscribeToIgAccounts(user.uid, setIgAccounts);
  }, [user]);

  useEffect(() => {
    if (!editingRuleId) return;
    getRule(editingRuleId).then((rule) => {
      if (!rule) {
        Alert.alert(t('common.error') ?? '', 'Kural bulunamadı.');
        navigation.goBack();
        return;
      }
      setName(rule.name);
      setReactionFilter(rule.reactionFilter ?? '');
      setDmFlow(rule.dmFlow);
      setExistingPriority(rule.priority);
      setLoadingRule(false);
    });
  }, [editingRuleId]);

  const activeIgAccount = igAccounts[0] ?? null;
  const TITLES: Record<typeof triggerType, string> = {
    mention: t('rules.mentionRuleTitle'),
    reaction: t('rules.reactionRuleTitle'),
    story_mention: t('rules.storyMentionRuleTitle'),
    story_reply: t('rules.storyReplyRuleTitle'),
  };
  const title = TITLES[triggerType];

  const handleSave = async () => {
    if (!user || !activeIgAccount) return;

    setSaving(true);
    try {
      const payload: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'> = {
        ownerUid: user.uid,
        igAccountId: activeIgAccount.id,
        name: name || title,
        targetScope: 'all_posts',
        targetPostIds: [],
        triggerType,
        aiIntentTags: [],
        keywords: [],
        reactionFilter: triggerType === 'reaction' ? reactionFilter.trim() || null : null,
        publicReplyEnabled: false,
        publicReplyText: '',
        dmEnabled: true,
        dmFlow,
        variantB: null,
        priority: existingPriority ?? Date.now(),
        status: 'active',
        stats: createEmptyRuleStats(),
        statsB: createEmptyRuleStats(),
      };

      const result = await saveRuleWithFreemiumGate({
        editingRuleId,
        userUid: user.uid,
        subscriptionTier: subscription?.tier,
        freePostUsed: subscription?.freePostUsed,
        payload,
      });
      if (result === 'paywall') {
        navigation.navigate('Paywall');
        return;
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common.error') ?? '', error.message ?? '');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingRuleId) return;
    Alert.alert(t('rules.deleteRule'), t('rules.deleteRuleConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteRule(editingRuleId);
            navigation.goBack();
          } catch (error: any) {
            Alert.alert(t('common.error') ?? '', error.message ?? '');
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loadingRule) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>{title}</Text>

      <TextField
        label="Kural adı (opsiyonel)"
        value={name}
        onChangeText={setName}
        placeholder={title}
      />

      {triggerType === 'reaction' && (
        <TextField
          label={t('rules.reactionFilterLabel') ?? undefined}
          placeholder={t('rules.reactionFilterPlaceholder') ?? undefined}
          value={reactionFilter}
          onChangeText={setReactionFilter}
        />
      )}

      <DmFlowStep dmFlow={dmFlow} onChange={setDmFlow} />

      <Button label={t('rules.saveRule')} onPress={handleSave} loading={saving} style={styles.saveButton} />

      {editingRuleId && (
        <Button
          label={t('rules.deleteRule')}
          variant="ghost"
          onPress={handleDelete}
          loading={deleting}
          style={styles.deleteButton}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  saveButton: { marginTop: spacing.lg },
  deleteButton: { marginTop: spacing.sm },
});
