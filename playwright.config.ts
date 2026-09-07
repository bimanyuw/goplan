import { defineConfig } from '@playwright/test';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
export default defineConfig({
    testDir: './tests',
    outputDir: './playwright-report/e2e',
    timeout: 60000,
    testMatch: ['**/public.spec.ts', '**/live.spec.ts'],
    use: { browserName: 'chromium', channel: process.env.CI ? undefined : 'chrome', headless: true, baseURL: 'http://localhost:3000' },
    workers: 1,
    webServer: {
        command: 'node node_modules/next/dist/bin/next start',
        url: 'http://localhost:3000',
        reuseExistingServer: false,
        timeout: 120000,
    },
});
