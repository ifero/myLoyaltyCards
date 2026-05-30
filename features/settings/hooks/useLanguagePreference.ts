import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo } from 'react-native';

import { changeAppLanguage, resolveLanguagePreference } from '@/shared/i18n';

import {
  getLanguagePreference,
  setLanguagePreference,
  type LanguagePreference
} from '@/features/settings/settings-repository';

import type { LanguageOption } from '../types';

export const useLanguagePreference = () => {
  const { t } = useTranslation();
  const [languageCode, setLanguageCode] = useState<LanguagePreference>(() =>
    getLanguagePreference()
  );
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);

  const supportedLanguages = useMemo<LanguageOption[]>(() => {
    return [
      { code: 'system', name: t('common.system') },
      { code: 'en', name: t('common.english') },
      { code: 'it', name: t('common.italian') }
    ];
  }, [t]);

  const resolvedCode = resolveLanguagePreference(languageCode);
  const fallbackLanguage = supportedLanguages.find((language) => language.code === 'en') ?? {
    code: 'en' as const,
    name: t('common.english')
  };
  const resolvedLanguage =
    supportedLanguages.find((language) => language.code === resolvedCode) ?? fallbackLanguage;

  const languageName =
    languageCode === 'system'
      ? t('settings.language.systemValue', { language: resolvedLanguage.name })
      : resolvedLanguage.name;

  const openLanguagePicker = () => setIsLanguagePickerOpen(true);
  const closeLanguagePicker = () => setIsLanguagePickerOpen(false);

  const selectLanguage = (code: LanguagePreference) => {
    const selectedLabel =
      supportedLanguages.find((language) => language.code === code)?.name ?? t('common.english');

    setLanguageCode(code);
    setLanguagePreference(code);
    void changeAppLanguage(code);
    AccessibilityInfo.announceForAccessibility?.(
      t('settings.language.selectedAnnouncement', { language: selectedLabel })
    );
    closeLanguagePicker();
  };

  return {
    languageCode,
    languageName,
    supportedLanguages,
    isLanguagePickerOpen,
    openLanguagePicker,
    closeLanguagePicker,
    selectLanguage
  };
};
