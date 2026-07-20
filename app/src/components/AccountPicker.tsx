import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActiveAccount } from '../store/ActiveAccountContext';
import { colors, radius, spacing, typography } from '../theme/theme';

// Only worth rendering once there's an actual choice to make — a single
// connected account doesn't need a switcher cluttering the screen.
export function AccountPicker() {
  const { accounts, activeAccount, setActiveAccountKey } = useActiveAccount();
  if (accounts.length <= 1) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {accounts.map((account) => {
        const isActive = account.key === activeAccount?.key;
        const label =
          account.platform === 'instagram'
            ? `@${account.igAccount.igUsername}`
            : account.whatsAppAccount.displayPhoneNumber;
        return (
          <Pressable
            key={account.key}
            onPress={() => setActiveAccountKey(account.key)}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            <Ionicons
              name={account.platform === 'instagram' ? 'logo-instagram' : 'logo-whatsapp'}
              size={14}
              color={isActive ? colors.textInverse : colors.textMuted}
            />
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { ...typography.body, color: colors.textMuted },
  chipTextActive: { color: colors.textInverse, fontWeight: '600' },
});
