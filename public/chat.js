document.addEventListener('DOMContentLoaded', function () {
    const loginDiv = document.getElementById('login');
    const chatDiv = document.getElementById('chat');
    const pseudoInput = document.getElementById('pseudo');
    const enterChatBtn = document.getElementById('enterChat');
    const form = document.getElementById('form');
    const input = document.getElementById('m');
    const messages = document.getElementById('messages');
    let pseudo = '';
    const socket = io();
    let initialized = false;

    enterChatBtn.addEventListener('click', () => {
        const val = pseudoInput.value.trim();
        if (val) {
            pseudo = val;
            loginDiv.style.display = 'none';
            chatDiv.style.display = 'block';
            input.focus();
        }
    });

    pseudoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') enterChatBtn.click();
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (input.value && pseudo) {
            socket.emit('chat message', { pseudo, message: input.value });
            input.value = '';
        }
    });

    // Affiche l'historique reçu du serveur (évite doublons)
    socket.on('chat history', function (history) {
        if (initialized) return;
        messages.innerHTML = '';
        history.forEach(function (data) {
            const item = document.createElement('li');
            item.textContent = `${data.pseudo}: ${data.content}`;
            messages.appendChild(item);
        });
        messages.scrollTop = messages.scrollHeight;
        initialized = true;
    });

    socket.on('chat message', function (data) {
        const item = document.createElement('li');
        item.textContent = `${data.pseudo}: ${data.message}`;
        messages.appendChild(item);
        messages.scrollTop = messages.scrollHeight;
    });
});
