/* eslint-env jest, node */
/**
 * Mock for @bwip-js/react-native
 * Used in Jest tests for barcode rendering
 */

const mockToDataURL = jest.fn(() =>
  Promise.resolve({
    uri: 'data:image/png;base64,mockImageData',
    width: 200,
    height: 100
  })
);

module.exports = {
  toDataURL: mockToDataURL,
  // Reset function for tests
  __mockReset: () => {
    mockToDataURL.mockClear();
  },
  __mockToDataURL: mockToDataURL
};
