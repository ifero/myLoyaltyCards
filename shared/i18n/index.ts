import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  getLanguagePreference,
  type LanguagePreference
} from '@/core/settings/settings-repository';

import { en } from './locales/en';
import { it } from './locales/it';

export const SUPPORTED_LANGUAGE_CODES = ['en', 'it'] as const;

export type AppLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

const resources = {
  en: { translation: en },
  it: { translation: it }
} as const;

const LANGUAGE_TAGS: Record<AppLanguageCode, string> = {
  en: 'en-US',
  it: 'it-IT'
};

const isSupportedLanguageCode = (value: string | null | undefined): value is AppLanguageCode => {
  return value === 'en' || value === 'it';
};

export const getSystemLanguage = (): AppLanguageCode => {
  const [locale] = getLocales();
  const languageCode = locale?.languageCode?.toLowerCase();
  const languageTag = locale?.languageTag?.toLowerCase();

  if (isSupportedLanguageCode(languageCode)) {
    return languageCode;
  }

  if (languageTag?.startsWith('it')) {
    return 'it';
  }

  return 'en';
};

export const resolveLanguagePreference = (
  preference: LanguagePreference | null | undefined
): AppLanguageCode => {
  if (!preference || preference === 'system') {
    return getSystemLanguage();
  }

  return preference;
};

export const getLocaleTagForLanguage = (
  preference: LanguagePreference | AppLanguageCode | null | undefined
): string => {
  return LANGUAGE_TAGS[resolveLanguagePreference(preference)];
};

export const changeAppLanguage = async (preference: LanguagePreference): Promise<void> => {
  await i18n.changeLanguage(resolveLanguagePreference(preference));
};

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: resolveLanguagePreference(getLanguagePreference()),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });
}

export default i18n;
