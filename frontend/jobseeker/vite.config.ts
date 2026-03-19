import path from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, searchForWorkspaceRoot } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const authProxyTarget = env.VITE_AUTH_PROXY_TARGET || 'http://localhost:8000'

  return {
    plugins: [react()],
    resolve: {
      alias: { '@shared': path.resolve(__dirname, '../../shared/frontend') },
    },
    server: {
      port: 5173,
      fs: {
        allow: [
          searchForWorkspaceRoot(process.cwd()),
          path.resolve(__dirname, '../../shared'),
        ],
      },
      proxy: {
        '/auth': {
          target: authProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
