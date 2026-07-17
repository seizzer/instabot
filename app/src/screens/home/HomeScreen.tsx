import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { colors, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../store/AuthContext';
import {
  subscribeToAutomationLogs,
  subscribeToIgAccounts,
  subscribeToRules,
} from '../../services/firestore';
import { AutomationLog, IgAccount, Rule } from '../../types/models';

function isToday(timestampMs: number): boolean {
  const d = new Date(timestampMs);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [igAccounts, setIgAccounts] = useState<IgAccount[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubRules = subscribeToRules(user.uid, setRules);
    const unsubAccounts = subscribeToIgAccounts(user.uid, setIgAccounts);
    const unsubLogs = subscribeToAutomationLogs(user.uid, setLogs);
    return () => {
      unsubRules();
      unsubAccounts();
      unsubLogs();
    };
  }, [user]);

  const todaysLogs = useMemo(() => logs.filter((l) => isToday(l.createdAt)), [logs]);
  const todaysComments = todaysLogs.filter((l) => l.eventType === 'comment_match').length;
  const todaysDms = todaysLogs.filter((l) => l.dmSent).length;
  const activeRulesCount = rules.filter((r) => r.status === 'active').length;
  const expiringAccount = igAccounts.find(
    (a) => a.status === 'token_expired' || a.tokenExpiresAt - Date.now() < 7 * 24 * 60 * 60 * 1000
  );

  return (
    <Screen>
      <Text style={styles.title}>{t('home.title')}</Text>

      {expiringAccount ? (
        <Card style={styles.warningCard}>
          <Text style={styles.warningText}>{t('home.tokenExpiringBanner')}</Text>
        </Card>
      ) : null}

      <View style={styles.statsRow}>
        <Animated.View style={styles.statCardWrap} entering={FadeInDown.delay(0).springify()}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{todaysComments}</Text>
            <Text style={styles.statLabel}>{t('home.todayComments')}</Text>
          </Card>
        </Animated.View>
        <Animated.View style={styles.statCardWrap} entering={FadeInDown.delay(80).springify()}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{todaysDms}</Text>
            <Text style={styles.statLabel}>{t('home.dmsSent')}</Text>
          </Card>
        </Animated.View>
        <Animated.View style={styles.statCardWrap} entering={FadeInDown.delay(160).springify()}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{activeRulesCount}</Text>
            <Text style={styles.statLabel}>{t('home.activeRules')}</Text>
          </Card>
        </Animated.View>
      </View>

      <Button
        label={t('home.newRule')}
        onPress={() => navigation.navigate('RulesTab', { screen: 'RuleWizard', params: {} })}
        style={styles.newRuleButton}
      />

      {rules.length === 0 ? <EmptyState icon="✨" message={t('home.emptyState')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  warningCard: { backgroundColor: '#FFF3E0', borderColor: colors.warning, marginBottom: spacing.md },
  warningText: { ...typography.body, color: '#8A5A00' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCardWrap: { flex: 1 },
  statCard: { alignItems: 'center' },
  statValue: { ...typography.h2, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
  newRuleButton: { marginBottom: spacing.md },
});
