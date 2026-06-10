import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import compression from "vite-plugin-compression";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const isProd = mode === "production";

  const apiBase = env.VITE_API_BASE || "http://localhost:8000";

  return {
    plugins: [
      react(),
      wasm(),
      compression({
        algorithm: "brotliCompress",
        ext: ".br",
        deleteOriginFile: false,
        threshold: 10 * 1024,
      }),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        components: path.resolve(__dirname, "./src/components"),
        styles: path.resolve(__dirname, "./src/styles"),
        locales: path.resolve(__dirname, "./src/locales"),
        assets: path.resolve(__dirname, "./src/assets"),
        buffer: "buffer",
      },
    },

    build: {
      target: "esnext",
      sourcemap: !isProd,
      outDir: "dist",
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            bootstrap: ["react-bootstrap"],
            i18n: ["i18next", "react-i18next"],
          },
        },
      },
    },

    server: {
      host: "localhost",
      port: Number(env.VITE_DEV_PORT || 5173),
      strictPort: true,
      open: true,
      proxy: {
        "/api": {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
        "/topic": {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
        "/user": {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
        "/fetch_url": {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
        "/check": {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
        "/process_evidence": {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
        "/process": {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
        "/wait_list": {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    preview: {
      port: Number(env.VITE_PREVIEW_PORT || 4173),
      strictPort: true,
    },

    define: {
      global: {},
    },

    optimizeDeps: {
      include: ["react", "react-dom", "react-bootstrap", "buffer"],
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
      },
    },
  };
});
