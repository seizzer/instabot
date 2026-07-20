import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';
import { NeuSurface } from './NeuSurface';

interface TextFieldProps extends TextInputProps {
  label?: string;
}

export function TextField({ label, style, secureTextEntry, ...rest }: TextFieldProps) {
  // Only fields opting into secureTextEntry get a reveal toggle — the toggle
  // itself flips this local flag rather than the caller's prop.
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <NeuSurface inset borderRadius={radius.md} contentStyle={styles.content}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          secureTextEntry={secureTextEntry && !revealed}
          {...rest}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setRevealed((prev) => !prev)}
            hitSlop={spacing.sm}
            style={styles.revealButton}
          >
            <Ionicons name={revealed ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </NeuSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.xs },
  content: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  revealButton: { paddingHorizontal: spacing.md },
});
