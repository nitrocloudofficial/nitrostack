module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'references-empty': [2, 'never'],
    'scope-enum': [2, 'always', ['billing', 'invoice', 'customer', 'orm', 'web', 'ci', 'batch']],
    'header-max-length': [2, 'always', 90]
  }
};
