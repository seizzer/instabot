import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DmFlow, DmFlowButton } from '../types/models';
import { colors, radius, spacing, typography } from '../theme/theme';
import { TextField } from './TextField';
import {
  addButton,
  addReplyNodeForButton,
  removeButton,
  updateButton,
  updateNode,
} from '../utils/dmFlow';

interface Props {
  flow: DmFlow;
  nodeId: string;
  onChange: (flow: DmFlow) => void;
  depth?: number;
}

const ACTIONS: { value: DmFlowButton['action']; labelKey: string }[] = [
  { value: 'reply', labelKey: 'rules.buttonActionReply' },
  { value: 'url', labelKey: 'rules.buttonActionUrl' },
  { value: 'file', labelKey: 'rules.buttonActionFile' },
];

export function DmNodeEditor({ flow, nodeId, onChange, depth = 0 }: Props) {
  const { t } = useTranslation();
  const node = flow.nodes[nodeId];
  if (!node) return null;

  return (
    <View style={[styles.card, depth > 0 && styles.nestedCard]}>
      <TextField
        placeholder={t('rules.dmMessagePlaceholder') ?? undefined}
        value={node.text}
        multiline
        onChangeText={(text) => onChange(updateNode(flow, nodeId, { text }))}
      />

      {node.type === 'file' ? (
        <TextField
          label={t('rules.fileUrl') ?? undefined}
          placeholder="https://..."
          value={node.mediaUrl ?? ''}
          onChangeText={(mediaUrl) => onChange(updateNode(flow, nodeId, { mediaUrl }))}
        />
      ) : null}

      {node.buttons.map((button) => (
        <View key={button.id} style={styles.buttonBlock}>
          <View style={styles.buttonHeaderRow}>
            <TextField
              label={t('rules.buttonLabel') ?? undefined}
              value={button.label}
              onChangeText={(label) =>
                onChange(updateButton(flow, nodeId, button.id, { label }))
              }
              style={styles.buttonLabelInput}
            />
            <Pressable
              onPress={() => onChange(removeButton(flow, nodeId, button.id))}
              hitSlop={8}
              style={styles.removeButton}
            >
              <Text style={styles.removeButtonText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.segmented}>
            {ACTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() =>
                  onChange(updateButton(flow, nodeId, button.id, { action: option.value }))
                }
                style={[
                  styles.segment,
                  button.action === option.value && styles.segmentActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    button.action === option.value && styles.segmentTextActive,
                  ]}
                >
                  {t(option.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>

          {button.action === 'url' && (
            <TextField
              label={t('rules.linkUrl') ?? undefined}
              placeholder="https://..."
              value={button.url ?? ''}
              autoCapitalize="none"
              onChangeText={(url) => onChange(updateButton(flow, nodeId, button.id, { url }))}
            />
          )}

          {button.action === 'file' && (
            <TextField
              label={t('rules.fileUrl') ?? undefined}
              placeholder="https://..."
              value={button.fileUrl ?? ''}
              autoCapitalize="none"
              onChangeText={(fileUrl) =>
                onChange(updateButton(flow, nodeId, button.id, { fileUrl }))
              }
            />
          )}

          {button.action === 'reply' &&
            (button.targetNodeId ? (
              <View style={styles.nextMessageWrapper}>
                <Text style={styles.nextMessageLabel}>{t('rules.nextMessage')}</Text>
                <DmNodeEditor
                  flow={flow}
                  nodeId={button.targetNodeId}
                  onChange={onChange}
                  depth={depth + 1}
                />
              </View>
            ) : (
              <Pressable
                style={styles.addMessageButton}
                onPress={() => onChange(addReplyNodeForButton(flow, nodeId, button.id))}
              >
                <Text style={styles.addMessageButtonText}>+ {t('rules.nextMessage')}</Text>
              </Pressable>
            ))}
        </View>
      ))}

      {node.buttons.length < 3 && (
        <Pressable style={styles.addButtonCta} onPress={() => onChange(addButton(flow, nodeId))}>
          <Text style={styles.addButtonCtaText}>{t('rules.addButton')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  nestedCard: {
    marginTop: spacing.sm,
    marginBottom: 0,
    backgroundColor: colors.background,
  },
  buttonBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  buttonHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
  buttonLabelInput: { flex: 1 },
  removeButton: { padding: spacing.sm, marginTop: spacing.xs },
  removeButtonText: { color: colors.textMuted, fontSize: 16 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { ...typography.caption, color: colors.textMuted },
  segmentTextActive: { color: colors.textInverse, fontWeight: '600' },
  nextMessageWrapper: { marginLeft: spacing.sm, paddingLeft: spacing.sm, borderLeftWidth: 2, borderLeftColor: colors.primarySoft },
  nextMessageLabel: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  addMessageButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  addMessageButtonText: { color: colors.primary, fontWeight: '600' },
  addButtonCta: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  addButtonCtaText: { color: colors.primary, fontWeight: '600' },
});
