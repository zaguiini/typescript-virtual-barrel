module.exports = {
  root: true,
  // This tells ESLint to load the config from the package `eslint-config-custom`
  extends: ['custom'],
  overrides: [
    {
      files: ['./packages/tests/**/*.js'],
      rules: {
        'prettier/prettier': 'off',
      },
    },
  ],
}
