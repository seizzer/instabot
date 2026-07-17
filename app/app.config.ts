import type { ExpoConfig } from 'expo/config';

// expo/config's ExpoConfig type doesn't know about "autolinking" yet even
// though Expo's own config schema and EAS Build already support it.
type ExpoConfigWithAutolinking = ExpoConfig & {
  autolinking?: {
    ios?: {
      buildFromSource?: string[];
    };
  };
};

const config: ExpoConfigWithAutolinking = {
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
  // Expo's precompiled RNReanimated iOS artifact and react-native-worklets
  // don't ship precompiled together — mixing a precompiled reanimated with
  // a source-built worklets (or vice versa) leaves RNReanimated linked
  // against an RNWorklets.framework path that doesn't exist in the bundle,
  // crashing at launch with "Library not loaded: RNWorklets". Forcing both
  // to build from source together avoids the mismatch.
  // https://docs.expo.dev/guides/prebuilt-expo-modules/
  autolinking: {
    ios: {
      buildFromSource: ['react-native-reanimated', 'react-native-worklets'],
    },
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
