module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  plugins: ['@typescript-eslint', 'prettier'],
  env: {
    node: true,
    jest: true,
    es6: true,
  },
  rules: {
    'prettier/prettier': 'error',
  },
  parser: '@typescript-eslint/parser',
}
