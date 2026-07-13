import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TextField } from '../../../components/TextField';
import { colors, spacing, typography } from '../../../theme/theme';

interface Props {
  enabled: boolean;
  text: string;
  onChangeEnabled: (enabled: boolean) => void;
  onChangeText: (text: string) => void;
}

export function PublicReplyStep({ enabled, text, onChangeEnabled, onChangeText }: Props) {
  const { t } = useTranslation();
  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('rules.step3Title')}</Text>
          <Text style={styles.subtitle}>{t('rules.step3Subtitle')}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onChangeEnabled}
          trackColor={{ true: colors.primary, false: colors.disabled }}
        />
      </View>
      {enabled && (
        <TextField
          value={text}
          onChangeText={onChangeText}
          placeholder={t('rules.publicReplyPlaceholder') ?? undefined}
          multiline
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  headerText: { flex: 1, marginRight: spacing.md },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted },
});
