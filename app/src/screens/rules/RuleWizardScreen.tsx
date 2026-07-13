import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { colors, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../store/AuthContext';
import {
  subscribeToIgAccounts,
  createRule,
  updateRule,
  deleteRule,
  getRule,
  markFreePostUsed,
} from '../../services/firestore';
import { createEmptyDmFlow, DmFlow, IgAccount, Rule, RuleTargetScope } from '../../types/models';
import { RulesStackParamList } from '../../navigation/types';
import { SelectPostStep } from './flowBuilder/SelectPostStep';
import { KeywordStep } from './flowBuilder/KeywordStep';
import { PublicReplyStep } from './flowBuilder/PublicReplyStep';
import { DmFlowStep } from './flowBuilder/DmFlowStep';

type Props = NativeStackScreenProps<RulesStackParamList, 'RuleWizard'>;

const TOTAL_STEPS = 4;

export function RuleWizardScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { user, subscription } = useAuth();
  const editingRuleId = route.params?.ruleId;

  const [igAccounts, setIgAccounts] = useState<IgAccount[]>([]);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [targetScope, setTargetScope] = useState<RuleTargetScope>('all_posts');
  const [targetPostIds, setTargetPostIds] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [publicReplyEnabled, setPublicReplyEnabled] = useState(true);
  const [publicReplyText, setPublicReplyText] = useState('');
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
      setTargetScope(rule.targetScope);
      setTargetPostIds(rule.targetPostIds);
      setKeywords(rule.keywords);
      setPublicReplyEnabled(rule.publicReplyEnabled);
      setPublicReplyText(rule.publicReplyText);
      setDmFlow(rule.dmFlow);
      setExistingPriority(rule.priority);
      setLoadingRule(false);
    });
  }, [editingRuleId]);

  const activeIgAccount = igAccounts[0] ?? null;

  const handleSave = async () => {
    if (!user || !activeIgAccount) return;

    // Freemium gate: first automated post is free, everything after requires Pro.
    if (!editingRuleId && subscription?.tier !== 'pro' && subscription?.freePostUsed) {
      navigation.navigate('Paywall');
      return;
    }

    setSaving(true);
    try {
      const payload: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'> = {
        ownerUid: user.uid,
        igAccountId: activeIgAccount.id,
        name: name || keywords[0] || 'Yeni Kural',
        targetScope,
        targetPostIds,
        triggerType: 'keyword',
        aiIntentTags: [],
        keywords,
        publicReplyEnabled,
        publicReplyText,
        dmEnabled: true,
        dmFlow,
        // A monotonically increasing value keeps newer rules evaluated after
        // older ones without needing a separate "count existing rules" query.
        priority: existingPriority ?? Date.now(),
        status: 'active',
        stats: { commentsMatched: 0, dmsSent: 0, dmsFailed: 0, buttonClicks: 0 },
      };

      if (editingRuleId) {
        await updateRule(editingRuleId, payload);
      } else {
        await createRule(payload);
        if (subscription?.tier !== 'pro' && !subscription?.freePostUsed) {
          await markFreePostUsed(user.uid);
        }
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

  const canGoNext = () => {
    if (step === 1) return keywords.length > 0;
    return true;
  };

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      handleSave();
    }
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
    else navigation.goBack();
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
      <View style={styles.progressRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
        ))}
      </View>

      {step === 0 && (
        <>
          <TextField
            label="Kural adı (opsiyonel)"
            value={name}
            onChangeText={setName}
            placeholder="Örn: Fiyat sorusu"
          />
          <SelectPostStep
            igAccountId={activeIgAccount?.id ?? null}
            targetScope={targetScope}
            targetPostIds={targetPostIds}
            onChange={(scope, ids) => {
              setTargetScope(scope);
              setTargetPostIds(ids);
            }}
          />
        </>
      )}

      {step === 1 && <KeywordStep keywords={keywords} onChange={setKeywords} />}

      {step === 2 && (
        <PublicReplyStep
          enabled={publicReplyEnabled}
          text={publicReplyText}
          onChangeEnabled={setPublicReplyEnabled}
          onChangeText={setPublicReplyText}
        />
      )}

      {step === 3 && <DmFlowStep dmFlow={dmFlow} onChange={setDmFlow} />}

      <View style={styles.footer}>
        <Button label={t('common.back')} variant="ghost" onPress={goBack} style={styles.footerButton} />
        <Button
          label={step === TOTAL_STEPS - 1 ? t('rules.saveRule') : t('common.next')}
          onPress={goNext}
          disabled={!canGoNext()}
          loading={saving}
          style={styles.footerButton}
        />
      </View>

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
  progressRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.primary },
  footer: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  footerButton: { flex: 1 },
  deleteButton: { marginTop: spacing.sm },
});
