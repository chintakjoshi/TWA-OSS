import path from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared/frontend'),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react/jsx-runtime': path.resolve(
        __dirname,
        'node_modules/react/jsx-runtime.js'
      ),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-dom/client': path.resolve(
        __dirname,
        'node_modules/react-dom/client.js'
      ),
      'react-router-dom': path.resolve(
        __dirname,
        'node_modules/react-router-dom'
      ),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./frontend/tests/setup.ts'],
    include: [
      'shared/frontend/**/*.test.ts',
      'shared/frontend/**/*.test.tsx',
      'frontend/**/*.test.ts',
      'frontend/**/*.test.tsx',
    ],
    restoreMocks: true,
    clearMocks: true,
  },
})
