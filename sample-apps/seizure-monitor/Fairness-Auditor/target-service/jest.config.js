/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // Strip .js extensions for ESM imports in TypeScript source
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Map @nitrostack/core to the actual package
    '^@nitrostack/core$': '<rootDir>/node_modules/@nitrostack/core/dist/core/index.js',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        moduleResolution: 'bundler',
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    }],
  },
  testMatch: ['**/*.test.ts'],
  // Exclude widget HTML and Nitro routes — Jest only tests pure logic files
  testPathIgnorePatterns: ['node_modules', 'src/routes', 'src/widgets'],
};
