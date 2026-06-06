module.exports = function (api) {
  api.cache(true);
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated muss IMMER der letzte Plugin sein.
      ...(isProduction
        ? [['transform-remove-console', { exclude: ['warn', 'error'] }]]
        : []),
      'react-native-reanimated/plugin',
    ],
  };
};
