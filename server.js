// ...existing code...
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import session from 'express-session';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PrismaClient } from './generated/prisma/index.js';
import twig from 'twig';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.FRONT_URL ? 'none' : 'lax'
    }
}));
const server = http.createServer(app);
const io = new SocketIOServer(server);
const prisma = new PrismaClient();

// Set Twig as the view engine
app.set('views', join(__dirname, 'views'));
app.set('view engine', 'twig');

// Serve static files
app.use(express.static(join(__dirname, 'public')));

// Main chat page

app.post('/login', async (req, res) => {
    const { pseudo, password } = req.body;
    if (!pseudo || !password) {
        return res.json({ success: false, message: 'Champs manquants' });
    }
    const user = await prisma.user.findUnique({ where: { pseudo } });
    if (!user || user.password !== password) {
        return res.json({ success: false, message: 'Identifiants invalides' });
    }
    req.session.user = { id: user.id, pseudo: user.pseudo };
    res.json({ success: true });
});

app.get('/', async (req, res) => {
    let messages = [];
    if (req.session.user) {
        messages = await prisma.message.findMany({
            orderBy: { createdAt: 'asc' },
            take: 20
        });
    }
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

// Déconnexion
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
