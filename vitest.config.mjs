import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const root = path.resolve(import.meta.dirname, '.');

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
  },
  resolve: {
    alias: {
      '@site': root,
      '@docusaurus/Link': path.join(root, 'src/__tests__/__mocks__/Link.jsx'),
      '@theme/Layout': path.join(root, 'src/__tests__/__mocks__/Layout.jsx'),
      '@docusaurus/theme-common': path.join(root, 'src/__tests__/__mocks__/theme-common.js'),
      '@docusaurus/useDocusaurusContext': path.join(root, 'src/__tests__/__mocks__/useDocusaurusContext.js'),
    },
  },
});
