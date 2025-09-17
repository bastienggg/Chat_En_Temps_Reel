
// Test E2E Playwright : simulation d'une session utilisateur
import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

test.describe('Chat en temps réel - E2E', () => {

    // Nettoyer les données avant chaque test
    test.beforeEach(async () => {
        await execAsync('node prisma/clearTestData.js');
    });

    test('Session complète utilisateur unique', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.fill('#pseudo', 'TestUser');
        await page.fill('#password', 'motdepasse');

        // Utiliser Promise.all pour attendre la navigation et le clic
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'load' }), // Attendre la navigation
            page.click('#loginForm button[type="submit"]') // Cliquer sur le bouton
        ]);

        // Vérifier qu'on est maintenant sur la page de chat
        expect(page.url()).toContain('/chat');
        await page.waitForSelector('#messages', { state: 'visible' });

        // Envoyer un message
        const testMessage = 'Bonjour à tous !';
        await page.fill('#m', testMessage);
        await page.click('#form button');

        // Attendre un peu pour que le message apparaisse
        await page.waitForTimeout(1000);

        // Vérifier que le message apparaît dans la liste
        await expect(page.locator('#messages')).toContainText(`TestUser : ${testMessage}`);
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

        // Connexion simultanée avec attente de navigation
        await Promise.all([
            user1.waitForNavigation({ waitUntil: 'load' }),
            user1.click('#loginForm button[type="submit"]')
        ]);

        await Promise.all([
            user2.waitForNavigation({ waitUntil: 'load' }),
            user2.click('#loginForm button[type="submit"]')
        ]);

        // Vérifier qu'on est sur les bonnes pages
        expect(user1.url()).toContain('/chat');
        expect(user2.url()).toContain('/chat');

        await user1.waitForSelector('#messages', { state: 'visible' });
        await user2.waitForSelector('#messages', { state: 'visible' });

        // Envoyer un message depuis user1
        const testMessage = 'Salut Bob !';
        await user1.fill('#m', testMessage);
        await user1.click('#form button');

        // Attendre un peu pour la propagation du message
        await user2.waitForTimeout(1000);

        // Vérifier que user2 reçoit le message
        await expect(user2.locator('#messages')).toContainText(`TestUser2 : ${testMessage}`);
        await user1.close();
        await user2.close();
    });
});
