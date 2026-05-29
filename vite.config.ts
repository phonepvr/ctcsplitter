import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site is served at https://<user>.github.io/ctcsplitter/
// so the asset base must match the repo name in CI, but stay at root locally.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/ctcsplitter/' : '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
