import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TextField } from '../../../components/TextField';
import { DmNodeEditor } from '../../../components/DmNodeEditor';
import { colors, spacing, typography } from '../../../theme/theme';
import { DmFlow } from '../../../types/models';

interface Props {
  enabled: boolean;
  publicReplyText: string;
  dmFlow: DmFlow;
  onChangeEnabled: (enabled: boolean) => void;
  onChangePublicReplyText: (text: string) => void;
  onChangeDmFlow: (flow: DmFlow) => void;
}

export function ABTestStep({
  enabled,
  publicReplyText,
  dmFlow,
  onChangeEnabled,
  onChangePublicReplyText,
  onChangeDmFlow,
}: Props) {
  const { t } = useTranslation();
  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('rules.abTestTitle')}</Text>
          <Text style={styles.subtitle}>{t('rules.abTestSubtitle')}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onChangeEnabled}
          trackColor={{ true: colors.primary, false: colors.disabled }}
        />
      </View>
      {enabled && (
        <>
          <Text style={styles.sectionLabel}>{t('rules.abTestVariantBPublicReply')}</Text>
          <TextField
            value={publicReplyText}
            onChangeText={onChangePublicReplyText}
            placeholder={t('rules.publicReplyPlaceholder') ?? undefined}
            multiline
          />
          <Text style={styles.sectionLabel}>{t('rules.abTestVariantBDmFlow')}</Text>
          <DmNodeEditor flow={dmFlow} nodeId={dmFlow.startNodeId} onChange={onChangeDmFlow} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  headerText: { flex: 1, marginRight: spacing.md },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted },
  sectionLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.xs },
});
