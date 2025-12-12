document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const mensagemErro = document.getElementById('mensagem-erro');

    // Se o admin tentar acessar a página de login já autenticado
    if (localStorage.getItem('adminToken')) {
        window.location.href = 'admin.html';
        return;
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            mensagemErro.textContent = ''; // Limpa a mensagem de erro

            const usuario = document.getElementById('usuario').value;
            const senha = document.getElementById('senha').value;

            try {
                // Rota já estava relativa, o que funciona bem em qualquer ambiente (OLD/NEW)
                const response = await fetch('/api/login', { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ usuario, senha })
                });

                const data = await response.json();

                if (response.ok) {
                    // Login bem-sucedido
                    localStorage.setItem('adminToken', data.token); // SALVA O TOKEN
                    window.location.href = 'admin.html'; // Redireciona para o painel
                } else {
                    // Falha no login
                    mensagemErro.textContent = data.message || 'Erro ao tentar fazer login.';
                }

            } catch (error) {
                console.error('Erro de rede:', error);
                mensagemErro.textContent = 'Erro de conexão com o servidor.';
            }
        });
    }
});