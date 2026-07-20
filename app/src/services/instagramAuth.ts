import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// Facebook Login for Business — required because the IG Business/Creator account
// must be linked to a Facebook Page (see PLAN.md, Meta App Review section).
const AUTHORIZATION_ENDPOINT = 'https://www.facebook.com/v21.0/dialog/oauth';

const SCOPES = [
  'instagram_basic',
  'instagram_manage_comments',
  'instagram_manage_messages',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'business_management',
];

export interface InstagramAuthResult {
  authorizationCode: string;
  redirectUri: string;
}

// The Cloud Function `exchangeInstagramCode` performs the actual code->token
// exchange server-side using the Meta app secret — it never touches the client.
export async function connectInstagramAccount(): Promise<InstagramAuthResult> {
  const appId = process.env.EXPO_PUBLIC_META_APP_ID;
  if (!appId) {
    throw new Error('EXPO_PUBLIC_META_APP_ID is not set — see .env.example');
  }

  // Empty string (unset in .env) must also fall through — `??` only catches
  // null/undefined, and an empty EXPO_PUBLIC_META_OAUTH_REDIRECT_URI= line
  // resolves to "" at runtime, not undefined.
  // `path: 'redirect'` matters — without it makeRedirectUri produces a bare
  // "instabot://" (empty host), which Meta's dashboard rejects when adding it
  // to Valid OAuth Redirect URIs ("should represent a valid URL").
  const redirectUri =
    process.env.EXPO_PUBLIC_META_OAUTH_REDIRECT_URI ||
    AuthSession.makeRedirectUri({ scheme: 'instabot', path: 'redirect' });

  const request = new AuthSession.AuthRequest({
    clientId: appId,
    scopes: SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: false, // Meta's OAuth dialog does not support PKCE; code exchange happens server-side with the app secret instead.
  });

  const result = await request.promptAsync({ authorizationEndpoint: AUTHORIZATION_ENDPOINT });

  if (result.type !== 'success' || !result.params.code) {
    throw new Error('Instagram bağlantısı iptal edildi veya başarısız oldu.');
  }

  return { authorizationCode: result.params.code, redirectUri };
}
