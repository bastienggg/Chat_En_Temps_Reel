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
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

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

// Nodemailer config (Mailtrap)
const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST || "sandbox.smtp.mailtrap.io",
    port: process.env.MAILTRAP_PORT ? parseInt(process.env.MAILTRAP_PORT) : 2525,
    auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS
    }
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
    // Hash password
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Générer un token de validation
        const validationToken = crypto.randomBytes(32).toString('hex');
        const user = await prisma.user.create({
            data: {
                pseudo,
                password: hashedPassword,
                email,
                isActive: false,
                validationToken
            }
        });
        // Envoyer l'email de validation
        const validationUrl = `${req.protocol}://${req.get('host')}/validate?token=${validationToken}`;
        await transporter.sendMail({
            from: 'no-reply@chatentempreel.com',
            to: email,
            subject: 'Validez votre compte',
            html: `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Validation de compte</title>
    <style>
        body {
            background: #120D08;
            color: #fff;
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 480px;
            margin: 40px auto;
            background: #18120c;
            border-radius: 12px;
            box-shadow: 0 2px 16px #0008;
            padding: 32px 24px;
            border: 1px solid #E3882D44;
        }
        h1 {
            color: #E3882D;
            font-size: 1.7em;
            margin-bottom: 0.5em;
        }
        p {
            color: #fff;
            font-size: 1.1em;
            margin-bottom: 1.2em;
        }
        a.button {
            display: inline-block;
            background: #E3882D;
            color: #120D08;
            text-decoration: none;
            font-weight: bold;
            padding: 12px 28px;
            border-radius: 6px;
            font-size: 1.1em;
            margin-top: 12px;
            transition: background 0.2s;
        }
        a.button:hover {
            background: #ff9c3a;
        }
        .footer {
            margin-top: 2em;
            color: #E3882D;
            font-size: 0.95em;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Bienvenue, ${pseudo} !</h1>
        <p>Merci de vous être inscrit sur <b>Chat En Temps Réel</b>.<br>
        Pour activer votre compte, cliquez sur le bouton ci-dessous :</p>
        <p style="text-align:center;">
            <a href="${validationUrl}" class="button">Valider mon compte</a>
        </p>
        <p>Ou copiez ce lien dans votre navigateur :<br>
            <a href="${validationUrl}" style="color:#E3882D;">${validationUrl}</a>
        </p>
        <div class="footer">&copy; 2025 Chat En Temps Réel</div>
    </div>
</body>
</html>`
        });
        req.session.user = { id: user.id, pseudo: user.pseudo };
        req.session.save(() => {
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                res.json({ success: true, message: 'Inscription réussie. Vérifiez vos emails pour valider votre compte.', redirect: '/' });
            } else {
                res.redirect('/');
            }
        });
    } catch (err) {
        res.json({ success: false, message: "Erreur lors de l'inscription : " + (err.message || err) });
    }
});

// Validation route
app.get('/validate', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.send('Lien de validation invalide.');
    }
    const user = await prisma.user.findFirst({ where: { validationToken: token } });
    if (!user) {
        return res.send('Lien de validation invalide ou expiré.');
    }
    await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true, validationToken: null }
    });
    // Connecte automatiquement l'utilisateur après validation
    req.session.user = { id: user.id, pseudo: user.pseudo };
    req.session.save(() => {
        res.render('validated', { pseudo: user.pseudo });
    });
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
    // Vérifie si le compte est validé
    const user = await prisma.user.findUnique({ where: { id: req.session.user.id } });
    if (!user || !user.isActive) {
        return res.render('not-validated', { email: user ? user.email : '' });
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
    if (!user) {
        return res.render('login', { error: 'Identifiants invalides' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
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
