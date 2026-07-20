import type { ExpoConfig } from 'expo/config';

// EAS Build sets this to the eas.json profile name being built
// (https://docs.expo.dev/build-reference/variables/) — unset for local
// `expo start`/dev-client runs, which should behave like a development build.
const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production';

const config: ExpoConfig = {
  // User-visible app name (home screen, app store listing). The internal
  // slug/scheme/bundleIdentifier stay "instabot" — changing those would
  // break the instabot:// redirect URI already registered in the Meta panel.
  name: 'Chatterly',
  slug: 'instabot',
  scheme: 'instabot',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    // "com.instabot.app" was already taken in Apple's global App ID
    // namespace by someone else — iOS uses a different bundle ID than
    // Android's package name (com.instabot.app), which is fine, they don't
    // need to match.
    bundleIdentifier: 'com.chatterly.app',
    usesAppleSignIn: true,
    // GOOGLE_SERVICE_INFO_PLIST is an EAS file env var (gitignored files
    // aren't uploaded to EAS Build's git-archive-based project upload) —
    // falls back to the local gitignored file for `expo start`/local builds.
    googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist',
    // No custom/non-exempt encryption beyond standard HTTPS/TLS — declaring
    // this avoids a manual App Store Connect prompt on every submission.
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    // Without Push Notifications capability, iOS can never register for APNs,
    // so Firebase Phone Auth can never use silent-push verification and always
    // falls back to reCAPTCHA (which then fails with "unable to load external
    // recaptcha dependencies"). We don't build user-facing push notifications
    // yet (see CLAUDE.md), this entitlement exists solely for phone-auth's
    // silent-push verification.
    entitlements: {
      'aps-environment': isProductionBuild ? 'production' : 'development',
    },
  },
  android: {
    package: 'com.instabot.app',
    adaptiveIcon: {
      // The logo.png already has its own dark background baked in, so the
      // adaptive icon background just needs to match rather than show
      // through a separate image.
      backgroundColor: '#161512',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-localization',
    'expo-web-browser',
    'expo-font',
    '@react-native-google-signin/google-signin',
    'expo-apple-authentication',
    '@react-native-firebase/app',
    // Registers the iOS URL scheme Firebase Phone Auth needs for its
    // reCAPTCHA fallback (see node_modules/@react-native-firebase/auth/plugin) —
    // without it, verifyPhoneNumber crashes natively when silent-push
    // verification isn't available (e.g. before the APNs Auth Key is
    // uploaded to Firebase Console).
    '@react-native-firebase/auth',
    [
      'react-native-fbsdk-next',
      {
        appID: process.env.EXPO_PUBLIC_META_APP_ID ?? '',
        clientToken: process.env.EXPO_PUBLIC_META_CLIENT_TOKEN ?? '',
        displayName: 'Chatterly',
        scheme: `fb${process.env.EXPO_PUBLIC_META_APP_ID ?? ''}`,
      },
    ],
    [
      'expo-build-properties',
      {
        // @react-native-firebase's Swift pods (FirebaseAuth, AppCheckCore)
        // require static frameworks with modular headers to link on iOS —
        // without this, `pod install` fails with "cannot yet be integrated
        // as static libraries".
        ios: {
          useFrameworks: 'static',
        },
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'cover',
        backgroundColor: '#161512',
        // Without this, iOS constrains the splash image to a small
        // 100pt-wide centered box regardless of resizeMode — this is the
        // plugin's own default "icon" style, not a bug in our config, but
        // it isn't what we want for a full-bleed splash image.
        ios: {
          enableFullScreenImage_legacy: true,
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: '55bc2e5b-9de4-4081-ac1e-eb95f7be3121',
    },
  },
};

export default config;
