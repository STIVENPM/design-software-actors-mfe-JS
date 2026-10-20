import { federation } from '@module-federation/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'actorsMfe',
      filename: 'remoteEntry.js',
      dts: false,
      exposes: {
        './App': './src/ui/App.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom': { singleton: true, requiredVersion: '^18.3.1' },
      },
    }),
  ],
  server: {
    port: 5106,
  },
})
