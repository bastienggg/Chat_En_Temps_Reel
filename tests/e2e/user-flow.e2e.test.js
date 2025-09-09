
// Test E2E Playwright : simulation d'une session utilisateur
import { test, expect } from '@playwright/test';

test.describe('Chat en temps réel - E2E', () => {

    test('Session complète utilisateur unique', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.fill('#pseudo', 'TestUser');
        await page.fill('#password', 'motdepasse');
        await page.click('#loginForm button[type="submit"]');
        // Attendre que le chat apparaisse
        await page.waitForSelector('#chat', { state: 'visible' });
        await page.fill('#m', 'Bonjour à tous !');
        await page.click('#form button');
        await expect(page.locator('#messages li:last-child')).toContainText('Bonjour à tous !');
    });


    test('Simulation de 2 utilisateurs', async ({ browser }) => {
        const user1 = await browser.newPage();
        const user2 = await browser.newPage();
        await user1.goto('http://localhost:3000');
        await user2.goto('http://localhost:3000');
        await user1.fill('#pseudo', 'TestUser2');
        await user1.fill('#password', 'motdepasse');
        await user2.fill('#pseudo', 'TestUser3');
        await user2.fill('#password', 'motdepasse');
        await user1.click('#loginForm button[type="submit"]');
        await user2.click('#loginForm button[type="submit"]');
        await user1.waitForSelector('#chat', { state: 'visible' });
        await user2.waitForSelector('#chat', { state: 'visible' });
        await user1.fill('#m', 'Salut Bob !');
        await user1.click('#form button');
        await expect(user2.locator('#messages li:last-child')).toContainText('Salut Bob !');
        await user1.close();
        await user2.close();
    });
});
