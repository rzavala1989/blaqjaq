/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: { plugins: ['babel-plugin-styled-components'] },
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'styled-components'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: [
            'three',
            '@react-three/fiber',
            '@react-three/drei',
            '@react-three/postprocessing',
          ],
          react: ['react', 'react-dom', 'styled-components'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
