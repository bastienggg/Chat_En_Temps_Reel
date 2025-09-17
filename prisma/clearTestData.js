import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function clearTestData() {
    try {
        // Supprimer tous les messages pour un environnement de test propre
        await prisma.message.deleteMany({});
        console.log('Tous les messages ont été supprimés.');

        // Optionnel : on peut aussi remettre à zéro les compteurs
        console.log('Base de données nettoyée pour les tests.');
    } catch (error) {
        console.error('Erreur lors du nettoyage:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

clearTestData();