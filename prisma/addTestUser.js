const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.create({
        data: {
            pseudo: 'testuser',
            password: 'password123', // Mot de passe en clair pour le test
            email: 'testuser@example.com',
            isActive: true
        }
    });
    console.log('Utilisateur ajouté :', user);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
