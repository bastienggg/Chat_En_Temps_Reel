// Configuration Playwright pour tests E2E
// Docs: https://playwright.dev/docs/test-configuration

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
    testDir: './tests/e2e',
    timeout: 30000,
    retries: 0,
    use: {
        baseURL: 'http://localhost:3000',
        headless: true,
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
    },
};

module.exports = config;
