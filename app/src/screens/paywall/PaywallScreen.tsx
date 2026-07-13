import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { colors, spacing, typography } from '../../theme/theme';
import { getCurrentOffering, purchasePackage, restorePurchases } from '../../services/revenuecat';
import { RulesStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RulesStackParamList, 'Paywall'>;

const FEATURE_KEYS = [
  'paywall.featureUnlimitedRules',
  'paywall.featureAiMode',
  'paywall.featureTemplates',
] as const;

export function PaywallScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    getCurrentOffering().then(setOffering).catch(() => setOffering(null));
  }, []);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setPurchasing(true);
    try {
      const entitled = await purchasePackage(pkg);
      if (entitled) navigation.goBack();
    } catch (error: any) {
      if (!error?.userCancelled) Alert.alert(t('common.error') ?? '', error.message ?? '');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const entitled = await restorePurchases();
      if (entitled) navigation.goBack();
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('paywall.title')}</Text>
      <Text style={styles.note}>{t('paywall.freePostNote')}</Text>
      <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>

      <Card style={styles.featuresCard}>
        {FEATURE_KEYS.map((key) => (
          <View key={key} style={styles.featureRow}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>{t(key)}</Text>
          </View>
        ))}
      </Card>

      {offering?.availablePackages.map((pkg) => (
        <Button
          key={pkg.identifier}
          label={`${t('paywall.subscribeButton')} · ${pkg.product.priceString}`}
          onPress={() => handlePurchase(pkg)}
          loading={purchasing}
          style={styles.packageButton}
        />
      ))}

      <Button
        label={t('paywall.restoreButton')}
        variant="ghost"
        onPress={handleRestore}
        disabled={purchasing}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.xs },
  note: { ...typography.caption, color: colors.primary, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  featuresCard: { marginBottom: spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  featureCheck: { color: colors.success, fontWeight: '700', marginRight: spacing.sm },
  featureText: { ...typography.body, color: colors.text },
  packageButton: { marginBottom: spacing.sm },
});
