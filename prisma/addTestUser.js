import { PrismaClient } from '../generated/prisma/index.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('motdepasse', 10);

    // Create test users for E2E tests
    const testUsers = [
        { pseudo: 'TestUser', email: 'testuser@example.com' },
        { pseudo: 'TestUser2', email: 'testuser2@example.com' },
        { pseudo: 'TestUser3', email: 'testuser3@example.com' }
    ];

    for (const userData of testUsers) {
        try {
            const user = await prisma.user.upsert({
                where: { pseudo: userData.pseudo },
                update: {
                    password: hashedPassword,
                    isActive: true
                },
                create: {
                    pseudo: userData.pseudo,
                    password: hashedPassword,
                    email: userData.email,
                    isActive: true
                }
            });
            console.log('Utilisateur créé/mis à jour :', user.pseudo);
        } catch (error) {
            console.error(`Erreur pour ${userData.pseudo}:`, error.message);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
