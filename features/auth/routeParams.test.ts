import { getSingleParam } from './routeParams';

describe('getSingleParam', () => {
  it('returns a string value unchanged', () => {
    expect(getSingleParam('change-password')).toBe('change-password');
  });

  it('returns the first element of an array value', () => {
    expect(getSingleParam(['first', 'second'])).toBe('first');
  });

  it('returns undefined when the value is undefined', () => {
    expect(getSingleParam(undefined)).toBeUndefined();
  });
});
