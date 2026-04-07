import { useState } from 'react';

import {
  getLanguagePreference,
  setLanguagePreference
} from '@/features/settings/settings-repository';

import type { LanguageOption } from '../types';

const SUPPORTED_LANGUAGES: LanguageOption[] = [{ code: 'en', name: 'English' }];

export const useLanguagePreference = () => {
  const [languageCode, setLanguageCode] = useState(() => getLanguagePreference());
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);

  const currentLanguage =
    SUPPORTED_LANGUAGES.find((language) => language.code === languageCode) ??
    SUPPORTED_LANGUAGES[0];
  const resolvedLanguage = currentLanguage ?? { code: 'en', name: 'English' };

  const openLanguagePicker = () => setIsLanguagePickerOpen(true);
  const closeLanguagePicker = () => setIsLanguagePickerOpen(false);

  const selectLanguage = (code: string) => {
    setLanguageCode(code);
    setLanguagePreference(code);
    closeLanguagePicker();
  };

  return {
    languageCode,
    languageName: resolvedLanguage.name,
    supportedLanguages: SUPPORTED_LANGUAGES,
    isLanguagePickerOpen,
    openLanguagePicker,
    closeLanguagePicker,
    selectLanguage
  };
};
