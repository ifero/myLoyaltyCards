/**
 * Expo Router surfaces a search param as `string | string[] | undefined` — the
 * array form appears when a key is present more than once in the URL. Auth
 * screens only ever want the first value, so normalize to a single string.
 */
export const getSingleParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;
