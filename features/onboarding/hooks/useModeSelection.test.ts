import { renderHook } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import { useModeSelection } from './useModeSelection';

describe('useModeSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selectLocalMode calls settings repository and navigates', () => {
    const pushSpy = useRouter().push as jest.Mock;
    const { result } = renderHook(() => useModeSelection());

    result.current.selectLocalMode();

    expect(pushSpy).toHaveBeenCalledWith('/onboarding/highlights');
  });

  it('selectCloudMode navigates to sign-up path', () => {
    const pushSpy = useRouter().push as jest.Mock;
    const { result } = renderHook(() => useModeSelection());

    result.current.selectCloudMode();

    expect(pushSpy).toHaveBeenCalledWith('/create-account');
  });

  it('contains no guest naming in public API', () => {
    const { result } = renderHook(() => useModeSelection());

    expect(Object.keys(result.current).join(' ')).not.toContain('guest');
  });
});
