// Legacy .eslintrc für ESLint 8 + eslint-config-expo 8.x (SDK 52 kompatibel)
module.exports = {
  extends: 'expo',
  ignorePatterns: ['dist/', 'node_modules/', '.expo/'],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    // Async setState patterns (called after await) are fine — rule is overly strict here
    'react-hooks/set-state-in-effect': 'warn',
    'react-hooks/set-state-in-render': 'warn',
    // React Compiler optimization rule — too strict for async useCallback patterns
    'react-hooks/preserve-manual-memoization': 'warn',
  },
};
