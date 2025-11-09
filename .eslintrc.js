module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: ['react-app', 'react-app/jest', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': 'error',
    'no-console': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['src/server.js'],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
