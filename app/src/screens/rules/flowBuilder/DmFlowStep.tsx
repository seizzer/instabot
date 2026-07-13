import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DmNodeEditor } from '../../../components/DmNodeEditor';
import { colors, spacing, typography } from '../../../theme/theme';
import { DmFlow } from '../../../types/models';

interface Props {
  dmFlow: DmFlow;
  onChange: (flow: DmFlow) => void;
}

export function DmFlowStep({ dmFlow, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <View>
      <Text style={styles.title}>{t('rules.step4Title')}</Text>
      <Text style={styles.subtitle}>{t('rules.step4Subtitle')}</Text>
      <DmNodeEditor flow={dmFlow} nodeId={dmFlow.startNodeId} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
});
