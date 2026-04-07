import { act, renderHook } from '@testing-library/react-native';

import { useLanguagePreference } from './useLanguagePreference';

const mockGetLanguagePreference = jest.fn();
const mockSetLanguagePreference = jest.fn();

jest.mock('@/features/settings/settings-repository', () => ({
  getLanguagePreference: () => mockGetLanguagePreference(),
  setLanguagePreference: (value: string) => mockSetLanguagePreference(value)
}));

describe('useLanguagePreference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLanguagePreference.mockReturnValue('en');
  });

  it('returns current language name and supported options', () => {
    const { result } = renderHook(() => useLanguagePreference());

    expect(result.current.languageCode).toBe('en');
    expect(result.current.languageName).toBe('English');
    expect(result.current.supportedLanguages).toEqual([{ code: 'en', name: 'English' }]);
  });

  it('updates and persists selected language', () => {
    const { result } = renderHook(() => useLanguagePreference());

    act(() => {
      result.current.selectLanguage('en');
    });

    expect(mockSetLanguagePreference).toHaveBeenCalledWith('en');
  });
});
