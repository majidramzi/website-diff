import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Base path:
 * - `vite build` and `vite preview` → "/website-diff/" for GitHub Pages
 *   (https://majidramzi.github.io/website-diff/)
 * - `vite dev` → "/" so the dev server works on any host/preview proxy
 *
 * Override with VITE_BASE if you deploy somewhere else.
 */
const usesPagesBase = process.argv.includes('preview');

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: process.env.VITE_BASE ?? (command === 'build' || usesPagesBase ? '/website-diff/' : '/'),
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Allow the sandbox/dev preview host to load the app.
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
}));
