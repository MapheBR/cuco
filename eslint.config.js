const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**', 'public/assets/**', 'backups/**', 'data/**', 'coverage/**'] },
  {
    files: ['server/**/*.js', 'scripts/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { args: 'none' }],
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
    },
  },
  {
    files: ['public/js/**/*.js', 'scripts/capture-video-screens.js', 'scripts/render-video-linkedin.js', 'scripts/render-social-images.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { args: 'none' }],
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
    },
  },
];
