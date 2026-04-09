import { render } from '@testing-library/react-native';

import { PaginationDots } from './PaginationDots';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      primary: '#1A73E8',
      borderStrong: '#8F8F94'
    }
  })
}));

describe('PaginationDots', () => {
  it('renders correct number of dots', () => {
    const { getByTestId } = render(<PaginationDots total={3} current={1} />);

    expect(getByTestId('pagination-dot-0')).toBeTruthy();
    expect(getByTestId('pagination-dot-1')).toBeTruthy();
    expect(getByTestId('pagination-dot-2')).toBeTruthy();
  });

  it('active dot has primary color styling', () => {
    const { getByTestId } = render(<PaginationDots total={3} current={1} />);

    expect(getByTestId('pagination-dot-1').props.style.backgroundColor).toBe('#1A73E8');
  });
});
