module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/test/**/*.spec.js', '**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['server/**/*.js', 'web/src/**/*.jsx'],
  coverageThreshold: { global: { branches: 70, functions: 75, lines: 78, statements: 78 } },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js']
};
