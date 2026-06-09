import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import compression from "vite-plugin-compression";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    compression({
      algorithm: "brotliCompress",
      ext: ".br",
      deleteOriginFile: false, // keep original uncompressed files
      threshold: 10240, // compress files larger than 10kb
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      components: path.resolve(__dirname, "./src/components"),
      styles: path.resolve(__dirname, "./src/styles"),
      locales: path.resolve(__dirname, "./src/locales"),
      buffer: "buffer",
    },
  },
  build: {
    target: "esnext",
    sourcemap: true,
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          bootstrap: ["react-bootstrap"],
        },
      },
    },
  },
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    open: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/topic": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/user": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/fetch_url": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/check": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/process_evidence": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/process": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/wait_list": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  define: {
    global: {},
    "process.env": {}, // Avoid undefined "process" references
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-bootstrap", "buffer"],
  },
});
