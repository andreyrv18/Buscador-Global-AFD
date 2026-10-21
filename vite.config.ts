import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'
import zip from 'vite-plugin-zip-pack'
import manifest from './manifest.config.js'
import { name, version } from './package.json'
const isTest = process.env.VITEST
export default defineConfig({
  resolve: {
    alias: {
      '@': `${path.resolve(__dirname, 'src')}`,
    },
  },
  plugins: [
    react(),

    // Executa os plugins de extensão e zip apenas fora dos testes
    !isTest && crx({ manifest }),
    !isTest && zip({ outDir: 'release', outFileName: `crx-${name}-${version}.zip` }),
  ].filter(Boolean),

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './setupTests.ts',
    // As specs de e2e/ são do Playwright
    exclude: [...configDefaults.exclude, 'e2e/**'],
    css: true,
    reporters: ['verbose'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      provider: 'v8'
    }
  },
  server: {
    cors: {
      origin: [
        /chrome-extension:\/\//,
      ],
    },
  },

  build: {
    rollupOptions: {
      input: {
        index: 'src/index.html',
      },
    },
  },
})
