import type {
  LanguagePreference as CoreLanguagePreference,
  ThemePreference as CoreThemePreference
} from '@/core/settings/settings-repository';

export type ThemePreference = CoreThemePreference;
export type LanguagePreference = CoreLanguagePreference;

export type LanguageOption = {
  code: LanguagePreference;
  name: string;
};

export type ExportCardRecord = {
  storeName: string;
  cardNumber: string;
  barcodeFormat: string;
  color: string;
  createdAt: string;
};

export type ExportPayload = {
  version: '1.0';
  appVersion: string;
  exportDate: string;
  cardCount: number;
  cards: ExportCardRecord[];
};
