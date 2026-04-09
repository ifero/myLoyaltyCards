import { act, renderHook } from '@testing-library/react-native';

import { useHighlightPagination } from './useHighlightPagination';

describe('useHighlightPagination', () => {
  it('next increments index', () => {
    const { result } = renderHook(() => useHighlightPagination());

    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(1);
  });

  it('skip jumps to last slide', () => {
    const { result } = renderHook(() => useHighlightPagination());

    act(() => result.current.skip());
    expect(result.current.currentIndex).toBe(2);
  });

  it('isLast is true on third slide', () => {
    const { result } = renderHook(() => useHighlightPagination());

    act(() => result.current.goTo(2));
    expect(result.current.isLast).toBe(true);
  });
});
