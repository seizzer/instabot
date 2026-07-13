import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { colors, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../store/AuthContext';
import { setRuleStatus, subscribeToRules } from '../../services/firestore';
import { Rule } from '../../types/models';
import { RulesStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RulesStackParamList, 'RulesList'>;

export function RulesListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToRules(user.uid, setRules);
  }, [user]);

  return (
    <Screen scroll={false} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('rules.title')}</Text>
        <Button
          label={t('rules.newRule')}
          onPress={() => navigation.navigate('RuleWizard', {})}
        />
      </View>

      <FlatList
        data={rules}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState icon="🗂️" message={t('rules.emptyState')} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('RuleWizard', { ruleId: item.id })}>
            <Card style={styles.ruleCard}>
              <View style={styles.ruleRow}>
                <View style={styles.ruleInfo}>
                  <Text style={styles.ruleName}>{item.name || t('rules.newRule')}</Text>
                  <Text style={styles.ruleKeywords} numberOfLines={1}>
                    {item.keywords.join(', ')}
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
                  {item.stats.commentsMatched} yorum · {item.stats.dmsSent} DM ·{' '}
                  {item.stats.buttonClicks} tık
                </Text>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  header: { marginBottom: spacing.md },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.md },
  listContent: { paddingBottom: spacing.xxl },
  ruleCard: { marginBottom: spacing.md },
  ruleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ruleInfo: { flex: 1, marginRight: spacing.md },
  ruleName: { ...typography.h3, color: colors.text },
  ruleKeywords: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  statsRow: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  statText: { ...typography.caption, color: colors.textMuted },
});
