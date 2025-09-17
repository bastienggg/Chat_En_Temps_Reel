document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('registerForm').onsubmit = async function (e) {
        e.preventDefault();
        const form = e.target;
        const data = {
            pseudo: form.pseudo.value,
            password: form.password.value,
            email: form.email.value
        };
        const res = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        document.getElementById('registerMessage').textContent = json.message;
        if (json.success && json.redirect) {
            window.location = json.redirect;
        }
    };
});
