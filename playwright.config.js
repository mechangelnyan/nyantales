import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/web',
  timeout: 60000,
  retries: 0,
  workers: 1,       // Serial execution — tests share localStorage via same origin
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
