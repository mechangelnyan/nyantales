import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/web',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:9876/web/',
    headless: true,
  },
  webServer: {
    command: 'python3 -m http.server 9876',
    port: 9876,
    reuseExistingServer: true,
  },
});
