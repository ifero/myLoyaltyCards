import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { changeAppLanguage } from './index';

const TranslationProbe = () => {
  const { t } = useTranslation();

  return (
    <View>
      <Text>{t('settings.preferences.languageLabel')}</Text>
      <Text>{t('auth.signIn.heading')}</Text>
      <Text>{t('addCard.selection.heading')}</Text>
      <Text>{t('cards.home.emptyStateTitle')}</Text>
      <Text>{t('cards.details.manageSection')}</Text>
    </View>
  );
};

describe('Italian localization rendering', () => {
  afterEach(async () => {
    await act(async () => {
      await changeAppLanguage('en');
    });
  });

  it('renders Italian copy across the main translated flows', async () => {
    await act(async () => {
      await changeAppLanguage('it');
    });

    render(<TranslationProbe />);

    expect(screen.getByText('Lingua')).toBeTruthy();
    expect(screen.getByText('Bentornato')).toBeTruthy();
    expect(screen.getByText('Aggiungi carta')).toBeTruthy();
    expect(screen.getByText('Nessuna carta ancora')).toBeTruthy();
    expect(screen.getByText('Gestisci')).toBeTruthy();
  });
});
