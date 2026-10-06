/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  // Workspace packages are untranspiled TypeScript; let babel-jest handle them too.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@techrat/.*|openapi-fetch|zod))",
  ],
  testMatch: ["<rootDir>/src/**/*.test.ts?(x)"],
};
