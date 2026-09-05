import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        // A non-opaque origin is required for the storage API exercised by
        // the persistence suite.
        url: 'http://localhost/',
      },
    },
    setupFiles: './src/setupTests.ts',
  },
});
