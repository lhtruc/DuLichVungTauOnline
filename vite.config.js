import { defineConfig } from 'vite';

// Relative base so the same build works on GitHub Pages (/<repo>/), an artifact host, or any static server.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
  },
  server: { host: true },
});
