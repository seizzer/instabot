import React from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { EmptyState } from '../../components/EmptyState';
import { colors, spacing, typography } from '../../theme/theme';

export function TemplatesScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Text style={{ ...typography.h1, color: colors.text, marginBottom: spacing.lg }}>
        {t('templates.title')}
      </Text>
      <EmptyState icon="🧩" message={t('templates.comingSoon')} />
    </Screen>
  );
}
