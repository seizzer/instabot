import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initI18n } from './src/i18n';
import { AuthProvider } from './src/store/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors, spacing } from './src/theme/theme';
import { configureGoogleSignIn, configureFacebookSignIn } from './src/services/socialAuth';

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
    configureGoogleSignIn();
    configureFacebookSignIn();
  }, []);

  if (!i18nReady) {
    return (
      <View style={styles.loadingScreen}>
        <Image source={require('./assets/icon.png')} style={styles.loadingLogo} resizeMode="contain" />
        <ActivityIndicator color={colors.primary} size="large" style={styles.loadingSpinner} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Matches the native splash screen's backgroundColor (app.config.ts) so
    // this JS-side loading screen is a seamless continuation, not the app's
    // own light theme (colors.background) — deliberately outside theme.ts.
    backgroundColor: '#161512',
  },
  loadingLogo: { width: 160, height: 160 },
  loadingSpinner: { marginTop: spacing.lg },
});
