import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup-vitest.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'expo-sqlite': path.resolve(__dirname, './src/test/mocks/expo-sqlite.ts'),
      'expo-crypto': path.resolve(__dirname, './src/test/mocks/expo-crypto.ts'),
      '@react-native-async-storage/async-storage': path.resolve(__dirname, './src/test/mocks/async-storage.ts'),
      'react-native': path.resolve(__dirname, './src/test/mocks/react-native.ts'),
    },
  },
});
