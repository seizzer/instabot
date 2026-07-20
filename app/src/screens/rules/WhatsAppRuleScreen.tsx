import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { AccountPicker } from '../../components/AccountPicker';
import { colors, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../store/AuthContext';
import { useActiveWhatsAppAccount } from '../../store/ActiveAccountContext';
import { deleteRule, getRule } from '../../services/firestore';
import { createEmptyDmFlow, createEmptyRuleStats, DmFlow, Rule } from '../../types/models';
import { RulesStackParamList } from '../../navigation/types';
import { KeywordStep } from './flowBuilder/KeywordStep';
import { DmFlowStep } from './flowBuilder/DmFlowStep';
import { saveRuleWithFreemiumGate } from './ruleSaveHelpers';

type Props = NativeStackScreenProps<RulesStackParamList, 'WhatsAppRule'>;

export function WhatsAppRuleScreen({ navigation, route }: Props) {
  const editingRuleId = route.params?.ruleId;
  const { t } = useTranslation();
  const { user, subscription } = useAuth();

  const activeWhatsAppAccount = useActiveWhatsAppAccount();
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [dmFlow, setDmFlow] = useState<DmFlow>(createEmptyDmFlow());
  const [existingPriority, setExistingPriority] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingRule, setLoadingRule] = useState(!!editingRuleId);

  useEffect(() => {
    if (!editingRuleId) return;
    getRule(editingRuleId).then((rule) => {
      if (!rule) {
        Alert.alert(t('common.error') ?? '', 'Kural bulunamadı.');
        navigation.goBack();
        return;
      }
      setName(rule.name);
      setKeywords(rule.keywords);
      setDmFlow(rule.dmFlow);
      setExistingPriority(rule.priority);
      setLoadingRule(false);
    });
  }, [editingRuleId]);

  const handleSave = async () => {
    if (!user || !activeWhatsAppAccount || keywords.length === 0) return;

    setSaving(true);
    try {
      const payload: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'> = {
        ownerUid: user.uid,
        igAccountId: '',
        platform: 'whatsapp',
        whatsAppAccountId: activeWhatsAppAccount.id,
        name: name || keywords[0] || 'Yeni Kural',
        targetScope: 'all_posts',
        targetPostIds: [],
        triggerType: 'keyword',
        aiIntentTags: [],
        keywords,
        reactionFilter: null,
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

  if (!activeWhatsAppAccount) {
    return (
      <Screen>
        <Text style={styles.title}>{t('rules.whatsAppRuleTitle')}</Text>
        <Text style={styles.noAccountText}>{t('rules.whatsAppAccountRequired')}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <AccountPicker />
      <Text style={styles.title}>{t('rules.whatsAppRuleTitle')}</Text>

      <TextField
        label="Kural adı (opsiyonel)"
        value={name}
        onChangeText={setName}
        placeholder={t('rules.whatsAppRuleTitle') ?? undefined}
      />

      <KeywordStep keywords={keywords} onChange={setKeywords} />
      <DmFlowStep dmFlow={dmFlow} onChange={setDmFlow} />

      <Button
        label={t('rules.saveRule')}
        onPress={handleSave}
        loading={saving}
        disabled={keywords.length === 0}
        style={styles.saveButton}
      />

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
  noAccountText: { ...typography.body, color: colors.textMuted },
  saveButton: { marginTop: spacing.lg },
  deleteButton: { marginTop: spacing.sm },
});
