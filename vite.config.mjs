import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import path from 'path';

export default defineConfig({
  plugins: [react(), wasm()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      components: path.resolve(__dirname, './src/components'),
      styles: path.resolve(__dirname, './src/styles'),
      locales: path.resolve(__dirname, './src/locales'),
      buffer: 'buffer',
    },
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          bootstrap: ['react-bootstrap'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  define: {
    'process.env': {}, // Avoid undefined "process" references
  },
  optimizeDeps: {
    include: ['buffer'],
  },
});