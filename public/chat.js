// Gestion du bouton de déconnexion
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
        await fetch('/logout');
        window.location.reload();
    });
}

document.addEventListener('DOMContentLoaded', function () {
    // Vérifier si on est sur la page de chat
    if (window.location.pathname === '/chat') {
        const form = document.getElementById('form');
        const input = document.getElementById('m');
        const messages = document.getElementById('messages');

        if (!form || !input || !messages) {
            console.error('Éléments de chat non trouvés');
            return;
        }

        // Récupérer le pseudo depuis l'affichage de l'utilisateur connecté
        const userDisplay = document.querySelector('.container div b');
        let pseudo = '';
        if (userDisplay) {
            pseudo = userDisplay.textContent.trim();
        }

        const socket = io();
        let initialized = false;

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (input.value && pseudo) {
                socket.emit('chat message', { pseudo, content: input.value });
                input.value = '';
            }
        });

        // Affiche l'historique reçu du serveur (évite doublons)
        socket.on('chat history', function (history) {
            if (initialized) return;
            messages.innerHTML = '';
            history.forEach(function (data) {
                const item = document.createElement('li');
                item.innerHTML = `<b style="color:#E3882D">${data.pseudo}</b> : ${data.content}`;
                messages.appendChild(item);
            });
            messages.scrollTop = messages.scrollHeight;
            initialized = true;
        });

        socket.on('chat message', function (data) {
            const item = document.createElement('li');
            item.innerHTML = `<b style="color:#E3882D">${data.pseudo}</b> : ${data.content || data.message}`;
            messages.appendChild(item);
            messages.scrollTop = messages.scrollHeight;
        });
    }

    // Gestion du formulaire de login (page login) - Laisser la soumission naturelle
    const loginForm = document.getElementById('loginForm');
    if (loginForm && window.location.pathname !== '/chat') {
        // Ne pas intercepter le formulaire de login, laisser la soumission HTML native
        // Le serveur gère déjà la redirection avec res.redirect('/chat')
        console.log('Login form found, using native HTML submission');
    }
});
