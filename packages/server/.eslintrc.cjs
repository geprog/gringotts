/* eslint-env node */

require('@geprog/eslint-config/patch/modern-module-resolution');

module.exports = {
  extends: ['@geprog', '@geprog/eslint-config/jest'],

  env: {
    'shared-node-browser': true,
  },

  parserOptions: {
    project: ['./tsconfig.eslint.json'],
    tsconfigRootDir: __dirname,
    extraFileExtensions: ['.cjs'],
  },
};
