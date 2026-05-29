/* global jest, module */
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
    mockToDataURL.mockImplementation(() =>
      Promise.resolve({
        uri: 'data:image/png;base64,mockImageData',
        width: 200,
        height: 100
      })
    );
  },
  __mockToDataURL: mockToDataURL
};
