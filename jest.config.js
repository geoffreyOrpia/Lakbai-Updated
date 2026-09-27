module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/core/utils/**/*.{js,jsx}',
    'src/domain/usecases/**/*.{js,jsx}',
    '!src/domain/usecases/directions.jsx',
    '!src/domain/usecases/onlineResearch.jsx',
  ],
};
