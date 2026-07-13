import { defineSecret } from 'firebase-functions/params';

// Centralized so each secret is only defined once across the codebase —
// firebase-functions throws if the same secret name is declared twice.
export const metaAppId = defineSecret('META_APP_ID');
export const metaAppSecret = defineSecret('META_APP_SECRET');
export const metaWebhookVerifyToken = defineSecret('META_WEBHOOK_VERIFY_TOKEN');
export const geminiProxyUrl = defineSecret('GEMINI_PROXY_URL');
export const geminiProxySharedSecret = defineSecret('GEMINI_PROXY_SHARED_SECRET');
export const revenueCatWebhookSecret = defineSecret('REVENUECAT_WEBHOOK_SECRET');
