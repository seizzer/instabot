import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';

const ENTITLEMENT_ID = 'pro';

let configured = false;

export function configureRevenueCat(appUserId: string) {
  if (configured) return;
  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    default: '',
  });
  if (!apiKey) {
    console.warn('RevenueCat API key missing — check .env');
    return;
  }
  Purchases.configure({ apiKey, appUserID: appUserId });
  configured = true;
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackage(pkg: Parameters<typeof Purchases.purchasePackage>[0]) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return isEntitled(customerInfo);
}

export async function restorePurchases(): Promise<boolean> {
  const customerInfo = await Purchases.restorePurchases();
  return isEntitled(customerInfo);
}

export function isEntitled(customerInfo: CustomerInfo): boolean {
  return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
}

// RevenueCat webhook (Cloud Functions) is the source of truth mirrored into
// Firestore `subscriptions/{uid}` — this listener keeps the client in sync
// even if the app was closed during a purchase.
export function subscribeToCustomerInfo(callback: (info: CustomerInfo) => void) {
  Purchases.addCustomerInfoUpdateListener(callback);
  return () => Purchases.removeCustomerInfoUpdateListener(callback);
}
