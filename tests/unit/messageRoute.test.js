// Test unitaire : Mock de Prisma et test de la création de message
const request = require('supertest');
const express = require('express');
const jestMock = require('jest-mock');

// Supposons que la route POST /api/message existe dans server.js
// On mock Prisma
const mockCreate = jestMock.fn();
const mockPrisma = {
    message: {
        create: mockCreate
    }
};

// On suppose que la route utilise req.body.pseudo et req.body.message
const app = express();
app.use(express.json());
app.post('/api/message', async (req, res) => {
    const { pseudo, message } = req.body;
    const saved = await mockPrisma.message.create({
        data: { pseudo, content: message }
    });
    res.status(201).json(saved);
});

describe('POST /api/message', () => {
    it('crée un message et retourne le bon code HTTP', async () => {
        mockCreate.mockResolvedValue({ id: 1, pseudo: 'toto', content: 'hello', createdAt: new Date() });
        const res = await request(app)
            .post('/api/message')
            .send({ pseudo: 'toto', message: 'hello' });
        expect(res.statusCode).toBe(201);
        expect(res.body.pseudo).toBe('toto');
        expect(res.body.content).toBe('hello');
        expect(mockCreate).toHaveBeenCalled();
    });
});
