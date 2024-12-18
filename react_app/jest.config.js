module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-json-tree|@remotion)/)"
  ],
  moduleFileExtensions: ['js', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  maxWorkers: 20,
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache'
}; 