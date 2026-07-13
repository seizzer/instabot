import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { colors, spacing, typography } from '../../theme/theme';
import { connectInstagramAccount } from '../../services/instagramAuth';
import { exchangeInstagramCode } from '../../services/functions';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'ConnectInstagram'>;

export function ConnectInstagramScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { authorizationCode, redirectUri } = await connectInstagramAccount();
      const { data } = await exchangeInstagramCode({ authorizationCode, redirectUri });
      navigation.navigate('ConnectionSuccess', { igUsername: data.igUsername });
    } catch (error: any) {
      Alert.alert(t('common.error') ?? '', error.message ?? '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('onboarding.connectTitle')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.connectSubtitle')}</Text>

      <Card style={styles.noteCard}>
        <Text style={styles.noteText}>{t('onboarding.pageRequiredNote')}</Text>
      </Card>

      <View style={styles.spacer} />
      <Button
        label={t('onboarding.connectButton')}
        onPress={handleConnect}
        loading={loading}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  noteCard: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  noteText: { ...typography.body, color: colors.primaryDark },
  spacer: { flex: 1, minHeight: spacing.xl },
});
