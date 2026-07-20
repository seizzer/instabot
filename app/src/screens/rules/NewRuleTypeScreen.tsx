import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { colors, spacing, typography } from '../../theme/theme';
import { RulesStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RulesStackParamList, 'NewRuleType'>;

export function NewRuleTypeScreen({ navigation }: Props) {
  const { t } = useTranslation();

  return (
    <Screen>
      <Text style={styles.title}>{t('rules.newRuleTypeTitle')}</Text>

      <Pressable onPress={() => navigation.navigate('RuleWizard', {})}>
        <Card style={styles.optionCard}>
          <Text style={styles.optionTitle}>{t('rules.typeKeyword')}</Text>
          <Text style={styles.optionDesc}>{t('rules.typeKeywordDesc')}</Text>
        </Card>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('SimpleTriggerRule', { triggerType: 'mention' })}
      >
        <Card style={styles.optionCard}>
          <Text style={styles.optionTitle}>{t('rules.typeMention')}</Text>
          <Text style={styles.optionDesc}>{t('rules.typeMentionDesc')}</Text>
        </Card>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('SimpleTriggerRule', { triggerType: 'reaction' })}
      >
        <Card style={styles.optionCard}>
          <Text style={styles.optionTitle}>{t('rules.typeReaction')}</Text>
          <Text style={styles.optionDesc}>{t('rules.typeReactionDesc')}</Text>
        </Card>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('SimpleTriggerRule', { triggerType: 'story_mention' })}
      >
        <Card style={styles.optionCard}>
          <Text style={styles.optionTitle}>{t('rules.typeStoryMention')}</Text>
          <Text style={styles.optionDesc}>{t('rules.typeStoryMentionDesc')}</Text>
        </Card>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('SimpleTriggerRule', { triggerType: 'story_reply' })}
      >
        <Card style={styles.optionCard}>
          <Text style={styles.optionTitle}>{t('rules.typeStoryReply')}</Text>
          <Text style={styles.optionDesc}>{t('rules.typeStoryReplyDesc')}</Text>
        </Card>
      </Pressable>

      <Pressable onPress={() => navigation.navigate('WhatsAppRule', {})}>
        <Card style={styles.optionCard}>
          <Text style={styles.optionTitle}>{t('rules.typeWhatsApp')}</Text>
          <Text style={styles.optionDesc}>{t('rules.typeWhatsAppDesc')}</Text>
        </Card>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  optionCard: { marginBottom: spacing.md },
  optionTitle: { ...typography.h3, color: colors.text },
  optionDesc: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
});
