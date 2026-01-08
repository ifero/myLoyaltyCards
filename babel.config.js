module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === 'test';
  
  return {
    presets: [
      [
        'babel-preset-expo',
        isTest ? {} : { jsxImportSource: 'nativewind' }
      ],
      ...(isTest ? [] : ['nativewind/babel'])
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
