import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'styled-components'],
  },
  build: {
    rollupOptions: {
      output: {
        // Vite 8's Rolldown build accepts a chunking function rather than
        // Rollup's legacy object form. Keep the intentional cache boundaries.
        manualChunks(id) {
          if (/[\\/]node_modules[\\/](three|@react-three[\\/](fiber|drei|postprocessing))[\\/]/.test(id)) {
            return 'three';
          }
          if (/[\\/]node_modules[\\/](react|react-dom|styled-components)[\\/]/.test(id)) {
            return 'react';
          }
          return undefined;
        },
      },
    },
  },
});
