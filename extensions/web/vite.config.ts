import { defineConfig } from 'vite';

// `base: './'` makes the build use relative asset paths so Robot-Game can be hosted
// under a sub-path (e.g. a page on the blog) rather than only at the site root.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
