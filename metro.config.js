// Sentry's Expo Metro config wraps Expo's default config to enable source map
// upload and component annotation (Story 16.2). It supersedes getDefaultConfig.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// SVG transformer: treat .svg as source (components) instead of assets
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo')
};
config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg']
};

module.exports = config;
