module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Unistyles babel plugin: `root` is required, but this repo spreads source
      // across app/features/shared/core — so `autoProcessImports` ensures EVERY
      // file importing react-native-unistyles is processed, regardless of folder.
      // NOTE: the Storybook web build reproduces this exact plugin config in
      // .storybook/main.ts (pluginReactOptions.babel) — keep the two in sync.
      [
        'react-native-unistyles/plugin',
        { root: 'app', autoProcessImports: ['react-native-unistyles'] }
      ],
      // Reanimated plugin MUST remain last.
      'react-native-reanimated/plugin'
    ]
  };
};
