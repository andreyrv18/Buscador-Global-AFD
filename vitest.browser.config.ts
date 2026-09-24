import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
    },
  },
  test: {
    include: ['src/**/*.browser.test.tsx'],
    setupFiles: ['./test-setup.ts'],
    globals: true,
    browser: {
      enabled: true,
      // No Vitest 5.x o provider fica dentro de cada instance
      instances: [
        {
          browser: 'chromium',
          provider: 'playwright',
        },
      ],
    },
  },
})


