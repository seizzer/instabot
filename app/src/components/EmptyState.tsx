import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/theme';

export function EmptyState({ icon, message }: { icon?: string; message: string }) {
  return (
    <View style={styles.container}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  icon: { fontSize: 40, marginBottom: spacing.md },
  message: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
