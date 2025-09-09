
// Test d'intégration Socket.IO : connexion, envoi/réception, historique
const { Server } = require('socket.io');
const { createServer } = require('http');
const Client = require('socket.io-client');
const express = require('express');
const jestMock = require('jest-mock');

let io, serverSocket, clientSocket, httpServer;

beforeAll((done) => {
    const app = express();
    httpServer = createServer(app);
    io = new Server(httpServer);

    io.on('connection', (socket) => {
        serverSocket = socket;
        console.log('[SERVER] Nouvelle connexion Socket.IO');
        socket.emit('chat history', [{ pseudo: 'bob', message: 'salut', createdAt: new Date() }]);
        socket.on('chat message', (data) => {
            console.log('[SERVER] Message reçu:', data);
            io.emit('chat message', { ...data, createdAt: new Date() });
        });
    });

    httpServer.listen(() => {
        const port = httpServer.address().port;
        console.log(`[SERVER] Serveur HTTP lancé sur le port ${port}`);
        // On écoute l'événement avant la connexion
        clientSocket = Client(`http://localhost:${port}`);
        done();
    });
});

afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
});

test('reçoit l\'historique à la connexion', (done) => {
    // On écoute l'événement avant de se connecter
    clientSocket.on('chat history', (messages) => {
        console.log('[CLIENT] Historique reçu:', messages);
        try {
            expect(messages[0].pseudo).toBe('bob');
            expect(messages[0].message).toBe('salut');
            done();
        } catch (err) {
            console.error('[CLIENT] Erreur dans le test historique:', err);
            done(err);
        }
    });
    // Si déjà connecté, l'événement sera reçu, sinon on force la connexion
    if (!clientSocket.connected) {
        console.log('[CLIENT] Connexion du client...');
        clientSocket.connect();
    }
}, 10000); // timeout augmenté à 10s

test('envoi et réception de message', (done) => {
    const msg = { pseudo: 'alice', message: 'coucou' };
    console.log('[CLIENT] Envoi du message:', msg);
    clientSocket.emit('chat message', msg);
    clientSocket.on('chat message', (data) => {
        console.log('[CLIENT] Message reçu:', data);
        expect(data.pseudo).toBe('alice');
        expect(data.message).toBe('coucou');
        done();
    });
});
