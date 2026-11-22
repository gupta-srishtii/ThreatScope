import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

const python = path.resolve(
  '.venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
)
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1080 } },
    },
  ],
  webServer: [
    {
      command: `"${python}" -m uvicorn threatscope.main:app --app-dir backend --host 127.0.0.1 --port 8001`,
      url: 'http://127.0.0.1:8001/api/health',
      reuseExistingServer: false,
      env: {
        ENVIRONMENT: 'test',
        DATABASE_URL: 'sqlite://',
        API_KEY: 'synthetic-e2e-workspace-key',
        ALLOWED_ORIGINS: 'http://127.0.0.1:5174',
      },
    },
    {
      command: 'npm run build && npm run preview -- --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
      timeout: 120000,
      env: { VITE_API_BASE_URL: 'http://127.0.0.1:8001' },
    },
  ],
})
