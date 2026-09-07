import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './tests',
    outputDir: './playwright-report/e2e',
    timeout: 60000,
    testMatch: '**/*.spec.ts',
    use: { browserName: 'chromium', channel: process.env.CI ? undefined : 'chrome', headless: true, baseURL: 'http://localhost:3000' },
    workers: 1,
    webServer: {
        command: 'npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: false,
        timeout: 120000,
    },
});
