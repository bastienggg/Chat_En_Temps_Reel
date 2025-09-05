import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PrismaClient } from './generated/prisma/index.js';
import twig from 'twig';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);
const prisma = new PrismaClient();

// Set Twig as the view engine
app.set('views', join(__dirname, 'views'));
app.set('view engine', 'twig');

// Serve static files
app.use(express.static(join(__dirname, 'public')));

// Main chat page
app.get('/', async (req, res) => {
    // Récupère les 20 derniers messages pour l'affichage initial
    const messages = await prisma.message.findMany({
        orderBy: { createdAt: 'asc' },
        take: 20
    });
    res.render('index', { messages });
});

// Socket.IO logic
io.on('connection', async (socket) => {
    // Envoie les derniers messages à la connexion (sécurité côté client aussi)
    const messages = await prisma.message.findMany({
        orderBy: { createdAt: 'asc' },
        take: 20
    });
    socket.emit('chat history', messages);

    socket.on('chat message', async (data) => {
        // Stocke le message en base
        const saved = await prisma.message.create({
            data: {
                pseudo: data.pseudo,
                content: data.message
            }
        });
        io.emit('chat message', { pseudo: saved.pseudo, message: saved.content, createdAt: saved.createdAt });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
