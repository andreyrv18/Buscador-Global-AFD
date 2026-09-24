import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    // Só roda arquivos .browser.test.tsx neste modo
    include: ['src/**/*.browser.test.tsx'],
    // Carrega os matchers do jest-dom
    setupFiles: ['./test-setup.ts'],
    globals: true,
    browser: {
      enabled: true,
      // Provider oficial para testes visuais com vitest-browser-react
      provider: 'playwright',
      instances: [
        { browser: 'chromium' },
      ],
    },
  },
})

