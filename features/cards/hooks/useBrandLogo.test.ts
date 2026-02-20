import { renderHook } from '@testing-library/react-native';

import { useBrandLogo } from './useBrandLogo';

describe('useBrandLogo', () => {
  it('returns brand when brandId matches', () => {
    const { result } = renderHook(() => useBrandLogo('esselunga'));
    expect(result.current).toBeDefined();
    expect(result.current?.id).toBe('esselunga');
  });

  it('returns undefined when brandId is null', () => {
    const { result } = renderHook(() => useBrandLogo(null));
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when brand not found', () => {
    const { result } = renderHook(() => useBrandLogo('non-existent'));
    expect(result.current).toBeUndefined();
  });
});
