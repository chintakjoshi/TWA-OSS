import path from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, searchForWorkspaceRoot } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const authProxyTarget = env.VITE_AUTH_PROXY_TARGET || 'http://localhost:8000'
  const appNodeModules = path.resolve(__dirname, 'node_modules')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, '../../shared/frontend'),
        react: path.resolve(appNodeModules, 'react'),
        'react/jsx-runtime': path.resolve(
          appNodeModules,
          'react/jsx-runtime.js'
        ),
        'react-dom': path.resolve(appNodeModules, 'react-dom'),
        'react-dom/client': path.resolve(appNodeModules, 'react-dom/client.js'),
        'react-router-dom': path.resolve(appNodeModules, 'react-router-dom'),
      },
      dedupe: ['react', 'react-dom', 'react-router-dom'],
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
        '/_auth': {
          target: authProxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (incomingPath) => incomingPath.replace(/^\/_auth/, ''),
        },
      },
    },
  }
})
