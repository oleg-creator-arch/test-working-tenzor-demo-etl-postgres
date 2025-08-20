module.exports = {
    clearMocks: true,
    testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)', '**/?(*.)+(test).mjs'],
    maxWorkers: 1,
    setupFilesAfterEnv: [ "jest-expect-message"],
    testPathIgnorePatterns: [
      "/node_modules/"
    ],
    transform: {
        '^.+\\.mjs$': 'babel-jest',
        '^.+\\.js$': 'babel-jest',
    },
    testEnvironment: 'node'
};