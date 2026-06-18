// Babel configuration for Jest tests.
// Omits the react-native-unistyles plugin on purpose: tests mock the engine via
// `react-native-unistyles/mocks` (see jest.setup.js), so no compile-time transform
// is needed and themed StyleSheet.create calls resolve through the mock.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
