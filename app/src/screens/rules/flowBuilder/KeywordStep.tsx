import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TextField } from '../../../components/TextField';
import { colors, radius, spacing, typography } from '../../../theme/theme';

interface Props {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}

export function KeywordStep({ keywords, onChange }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const addKeyword = () => {
    const value = draft.trim().toLocaleLowerCase('tr-TR');
    if (!value || keywords.includes(value)) {
      setDraft('');
      return;
    }
    onChange([...keywords, value]);
    setDraft('');
  };

  const removeKeyword = (word: string) => onChange(keywords.filter((k) => k !== word));

  return (
    <View>
      <Text style={styles.title}>{t('rules.step2Title')}</Text>
      <Text style={styles.subtitle}>{t('rules.step2Subtitle')}</Text>

      <View style={styles.inputRow}>
        <TextField
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addKeyword}
          placeholder="fiyat, kaç para, ücret..."
          autoCapitalize="none"
          style={styles.input}
        />
        <Pressable style={styles.addButton} onPress={addKeyword}>
          <Text style={styles.addButtonText}>{t('rules.addKeyword')}</Text>
        </Pressable>
      </View>

      <View style={styles.chipsWrap}>
        {keywords.map((word) => (
          <Pressable key={word} style={styles.chip} onPress={() => removeKeyword(word)}>
            <Text style={styles.chipText}>{word} ✕</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
  inputRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  input: { flex: 1 },
  addButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  addButtonText: { color: colors.primaryDark, fontWeight: '600' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: { ...typography.body, color: colors.text },
});
