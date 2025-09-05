// Gestion du bouton de déconnexion
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
        await fetch('/logout');
        window.location.reload();
    });
}
document.addEventListener('DOMContentLoaded', function () {


    const loginDiv = document.getElementById('login');
    const chatDiv = document.getElementById('chat');
    const loginForm = document.getElementById('loginForm');
    const pseudoInput = document.getElementById('pseudo');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');
    const form = document.getElementById('form');
    const input = document.getElementById('m');
    const messages = document.getElementById('messages');
    let pseudo = '';
    const socket = io();
    let initialized = false;

    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const pseudoVal = pseudoInput.value.trim();
            const passwordVal = passwordInput.value;
            if (!pseudoVal || !passwordVal) return;
            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pseudo: pseudoVal, password: passwordVal })
            });
            const data = await res.json();
            if (data.success) {
                pseudo = pseudoVal;
                loginDiv.style.display = 'none';
                chatDiv.style.display = 'block';
                input.focus();
            } else {
                loginError.textContent = data.message || 'Erreur de connexion';
                loginError.style.display = 'block';
            }
        });
    }

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
