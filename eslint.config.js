const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['.expo/**', 'dist/**', 'dist-test*/**', 'dist-validation*/**', '.agents/**', '.claude/**']),
  ...expoConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        pathGroups: [
          { pattern: '@/**', group: 'internal', position: 'before' }
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'always'
      }]
    }
  }
]);
