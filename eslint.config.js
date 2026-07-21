const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['.expo/**', 'dist/**', 'dist-test*/**', 'dist-validation*/**']),
  ...expoConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off'
    }
  }
]);
