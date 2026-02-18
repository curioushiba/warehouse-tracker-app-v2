module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-reanimated|lucide-react-native|react-native-toast-message|react-native-mmkv|react-native-gesture-handler|react-native-screens|react-native-safe-area-context)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['./src/test/setup-jest.ts'],
  testMatch: ['**/src/components/**/*.test.tsx', '**/src/app/**/*.test.tsx'],
}
