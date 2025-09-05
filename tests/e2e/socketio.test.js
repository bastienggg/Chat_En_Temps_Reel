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
        socket.emit('chat history', [{ pseudo: 'bob', message: 'salut', createdAt: new Date() }]);
        socket.on('chat message', (data) => {
            io.emit('chat message', { ...data, createdAt: new Date() });
        });
    });

    httpServer.listen(() => {
        const port = httpServer.address().port;
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
        try {
            expect(messages[0].pseudo).toBe('bob');
            expect(messages[0].message).toBe('salut');
            done();
        } catch (err) {
            done(err);
        }
    });
    // Si déjà connecté, l'événement sera reçu, sinon on force la connexion
    if (!clientSocket.connected) {
        clientSocket.connect();
    }
}, 10000); // timeout augmenté à 10s

test('envoi et réception de message', (done) => {
    const msg = { pseudo: 'alice', message: 'coucou' };
    clientSocket.emit('chat message', msg);
    clientSocket.on('chat message', (data) => {
        expect(data.pseudo).toBe('alice');
        expect(data.message).toBe('coucou');
        done();
    });
});
