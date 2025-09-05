const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const twig = require('twig');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set Twig as the view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Main chat page
app.get('/', (req, res) => {
    res.render('index');
});

// Socket.IO logic
io.on('connection', (socket) => {
    socket.on('chat message', (data) => {
        io.emit('chat message', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
