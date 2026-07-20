import { TFunction } from 'i18next';

// Firebase/RNFirebase auth errors carry a stable `code` like "auth/invalid-credential" —
// map those through i18n. Errors we throw ourselves (cancelled social sign-in, etc.) have
// no `code` and already carry a translated message, so those pass through untouched.
export function getAuthErrorMessage(error: unknown, t: TFunction): string {
  const err = error as { code?: string; message?: string } | null | undefined;
  if (err?.code?.startsWith('auth/')) {
    const shortCode = err.code.replace('auth/', '');
    return t(`auth.errors.${shortCode}`, { defaultValue: t('auth.errors.default') });
  }
  return err?.message || t('auth.errors.default');
}
