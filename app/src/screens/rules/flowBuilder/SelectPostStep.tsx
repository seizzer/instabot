import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, typography } from '../../../theme/theme';
import { listInstagramMedia, InstagramMediaItem } from '../../../services/functions';
import { RuleTargetScope } from '../../../types/models';

interface Props {
  igAccountId: string | null;
  targetScope: RuleTargetScope;
  targetPostIds: string[];
  onChange: (scope: RuleTargetScope, postIds: string[]) => void;
}

export function SelectPostStep({ igAccountId, targetScope, targetPostIds, onChange }: Props) {
  const { t } = useTranslation();
  const [media, setMedia] = useState<InstagramMediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (targetScope !== 'specific_posts' || !igAccountId) return;
    setLoading(true);
    listInstagramMedia({ igAccountId })
      .then((res) => setMedia(res.data.media))
      .catch(() => setMedia([]))
      .finally(() => setLoading(false));
  }, [targetScope, igAccountId]);

  const toggleSelected = (id: string) => {
    const next = targetPostIds.includes(id)
      ? targetPostIds.filter((p) => p !== id)
      : [...targetPostIds, id];
    onChange('specific_posts', next);
  };

  return (
    <View>
      <Text style={styles.title}>{t('rules.step1Title')}</Text>
      <Text style={styles.subtitle}>{t('rules.step1Subtitle')}</Text>

      <View style={styles.segmented}>
        <Pressable
          style={[styles.segment, targetScope === 'all_posts' && styles.segmentActive]}
          onPress={() => onChange('all_posts', [])}
        >
          <Text style={[styles.segmentText, targetScope === 'all_posts' && styles.segmentTextActive]}>
            {t('rules.allPosts')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segment, targetScope === 'specific_posts' && styles.segmentActive]}
          onPress={() => onChange('specific_posts', targetPostIds)}
        >
          <Text
            style={[styles.segmentText, targetScope === 'specific_posts' && styles.segmentTextActive]}
          >
            {t('rules.specificPosts')}
          </Text>
        </Pressable>
      </View>

      {targetScope === 'specific_posts' && (
        <>
          {loading && <ActivityIndicator color={colors.primary} style={styles.loader} />}
          <FlatList
            data={media}
            numColumns={3}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const selected = targetPostIds.includes(item.id);
              return (
                <Pressable onPress={() => toggleSelected(item.id)} style={styles.mediaTile}>
                  <Image source={{ uri: item.thumbnailUrl }} style={styles.mediaImage} />
                  {selected && (
                    <View style={styles.mediaSelectedOverlay}>
                      <Text style={styles.mediaSelectedCheck}>✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  segment: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { ...typography.body, color: colors.textMuted },
  segmentTextActive: { color: colors.textInverse, fontWeight: '600' },
  loader: { marginVertical: spacing.md },
  mediaTile: { width: '32%', aspectRatio: 1, margin: '0.66%', borderRadius: radius.sm, overflow: 'hidden' },
  mediaImage: { width: '100%', height: '100%' },
  mediaSelectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,107,74,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaSelectedCheck: { color: colors.textInverse, fontSize: 24, fontWeight: '700' },
});
