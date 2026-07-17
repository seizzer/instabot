import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { EmptyState } from '../../components/EmptyState';
import { colors, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../store/AuthContext';
import { setRuleStatus, subscribeToRules } from '../../services/firestore';
import { Rule, RuleStatus } from '../../types/models';
import { RulesStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RulesStackParamList, 'RulesList'>;

type StatusFilter = 'all' | RuleStatus;

function ruleSubtitle(rule: Rule, t: (key: string) => string | null): string {
  if (rule.triggerType === 'mention') return t('rules.typeMention') ?? '';
  if (rule.triggerType === 'reaction') {
    return rule.reactionFilter ? `${rule.reactionFilter} tepkisi` : t('rules.anyReaction') ?? '';
  }
  return rule.keywords.join(', ');
}

function ruleMatchesQuery(rule: Rule, query: string): boolean {
  const haystack = [rule.name, ...rule.keywords].join(' ').toLowerCase();
  return haystack.includes(query.toLowerCase());
}

const STATUS_FILTERS: { value: StatusFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'rules.filterAll' },
  { value: 'active', labelKey: 'rules.filterActive' },
  { value: 'paused', labelKey: 'rules.filterPaused' },
];

export function RulesListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    if (!user) return;
    return subscribeToRules(user.uid, setRules);
  }, [user]);

  const filteredRules = rules.filter(
    (rule) =>
      (statusFilter === 'all' || rule.status === statusFilter) &&
      (query.trim() === '' || ruleMatchesQuery(rule, query.trim()))
  );

  return (
    <Screen scroll={false} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('rules.title')}</Text>
        <Button
          label={t('rules.newRule')}
          onPress={() => navigation.navigate('NewRuleType')}
        />
      </View>

      {rules.length > 0 && (
        <>
          <TextField
            placeholder={t('rules.searchPlaceholder') ?? undefined}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          <View style={styles.filterRow}>
            {STATUS_FILTERS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setStatusFilter(option.value)}
                style={[styles.filterChip, statusFilter === option.value && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === option.value && styles.filterChipTextActive,
                  ]}
                >
                  {t(option.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <FlatList
        data={filteredRules}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="🗂️"
            message={rules.length > 0 ? t('rules.noSearchResults') : t('rules.emptyState')}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).springify()}>
            <Pressable
              onPress={() =>
                item.triggerType === 'mention' || item.triggerType === 'reaction'
                  ? navigation.navigate('SimpleTriggerRule', {
                      triggerType: item.triggerType,
                      ruleId: item.id,
                    })
                  : navigation.navigate('RuleWizard', { ruleId: item.id })
              }
            >
              <Card style={styles.ruleCard}>
                <View style={styles.ruleRow}>
                  <View style={styles.ruleInfo}>
                    <Text style={styles.ruleName}>{item.name || t('rules.newRule')}</Text>
                    <Text style={styles.ruleKeywords} numberOfLines={1}>
                      {ruleSubtitle(item, t)}
                    </Text>
                  </View>
                  <Switch
                    value={item.status === 'active'}
                    onValueChange={(value) =>
                      setRuleStatus(item.id, value ? 'active' : 'paused')
                    }
                    trackColor={{ true: colors.primary, false: colors.disabled }}
                    accessibilityLabel={item.status === 'active' ? t('rules.pause') : t('rules.resume')}
                  />
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.statText}>
                    {item.variantB ? `${t('rules.abVariantALabel')} ` : ''}
                    {item.stats.commentsMatched} yorum · {item.stats.dmsSent} DM ·{' '}
                    {item.stats.buttonClicks} tık
                  </Text>
                  {item.variantB && (
                    <Text style={styles.statText}>
                      {t('rules.abVariantBLabel')} {item.statsB.commentsMatched} yorum ·{' '}
                      {item.statsB.dmsSent} DM · {item.statsB.buttonClicks} tık
                    </Text>
                  )}
                </View>
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
  header: { marginBottom: spacing.md },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.md },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  filterChipTextActive: { color: colors.textInverse },
  listContent: { paddingBottom: spacing.xxl },
  ruleCard: { marginBottom: spacing.md },
  ruleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ruleInfo: { flex: 1, marginRight: spacing.md },
  ruleName: { ...typography.h3, color: colors.text },
  ruleKeywords: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  statsRow: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  statText: { ...typography.caption, color: colors.textMuted },
});
