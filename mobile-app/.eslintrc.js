// Legacy .eslintrc für ESLint 8 + eslint-config-expo 8.x (SDK 52 kompatibel)
module.exports = {
  extends: 'expo',
  ignorePatterns: ['dist/', 'node_modules/', '.expo/'],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
