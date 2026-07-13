import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import tr from './locales/tr.json';
import en from './locales/en.json';

export const LANGUAGE_STORAGE_KEY = 'instabot.language';
export const SUPPORTED_LANGUAGES = ['tr', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function detectDeviceLanguage(): SupportedLanguage {
  const deviceTag = Localization.getLocales()[0]?.languageCode ?? 'tr';
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(deviceTag)
    ? (deviceTag as SupportedLanguage)
    : 'tr';
}

export async function initI18n(): Promise<void> {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  const language = (stored as SupportedLanguage | null) ?? detectDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    lng: language,
    fallbackLng: 'tr',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
}

export async function changeLanguage(language: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export default i18n;
