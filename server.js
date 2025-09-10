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
        secure: false, // Important: false for localhost HTTP, true only in production HTTPS
        sameSite: 'lax'
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

// Registration page
app.get('/register', (req, res) => {
    res.render('register');
});

// Registration logic
app.post('/register', async (req, res) => {
    const { pseudo, password, email } = req.body;
    if (!pseudo || !password || !email) {
        return res.json({ success: false, message: 'Champs manquants' });
    }
    // Check if user already exists
    const existing = await prisma.user.findFirst({
        where: {
            OR: [
                { pseudo },
                { email }
            ]
        }
    });
    if (existing) {
        return res.json({ success: false, message: 'Pseudo ou email déjà utilisé' });
    }
    // Create user
    try {
        const user = await prisma.user.create({
            data: { pseudo, password, email }
        });
        req.session.user = { id: user.id, pseudo: user.pseudo };
        req.session.save(() => {
            console.log('Session after register:', req.session);
            // If the request is AJAX (fetch), send JSON, else redirect
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                res.json({ success: true, message: 'Inscription réussie', redirect: '/' });
            } else {
                res.redirect('/');
            }
        });
    } catch (err) {
        res.json({ success: false, message: "Erreur lors de l'inscription" });
    }
});


// Redirige la racine vers /login
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Affiche la page de connexion
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/chat');
    }
    res.render('login');
});

// Affiche la page de chat
app.get('/chat', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const messages = await prisma.message.findMany({
        orderBy: { createdAt: 'asc' },
        take: 20
    });
    res.render('index', { messages, user: req.session.user });
});

// Connexion utilisateur
app.post('/login', async (req, res) => {
    const { pseudo, password } = req.body;
    if (!pseudo || !password) {
        return res.render('login', { error: 'Champs manquants' });
    }
    const user = await prisma.user.findUnique({ where: { pseudo } });
    if (!user || user.password !== password) {
        return res.render('login', { error: 'Identifiants invalides' });
    }
    req.session.user = { id: user.id, pseudo: user.pseudo };
    req.session.save(() => {
        res.redirect('/chat');
    });
});

// Socket.IO logic

// --- Gestion des sockets ---
function handleSocketConnection(socket) {
    // Envoie l'historique à la connexion
    sendChatHistory(socket);
    socket.on('chat message', handleChatMessage);
}

async function sendChatHistory(socket) {
    const messages = await prisma.message.findMany({
        orderBy: { createdAt: 'asc' },
        take: 20
    });
    socket.emit('chat history', messages);
}

async function handleChatMessage(data) {
    if (!data.pseudo || (!data.content && !data.message)) {
        return;
    }
    const saved = await prisma.message.create({
        data: {
            pseudo: data.pseudo,
            content: data.content || data.message
        }
    });
    io.emit('chat message', {
        pseudo: saved.pseudo,
        content: saved.content,
        message: saved.content,
        createdAt: saved.createdAt
    });
}

io.on('connection', handleSocketConnection);

// Déconnexion
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid', { path: '/' });
        res.redirect('/');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
