function mostrarStatus(msg, cor = '#ff5555') {
  const div = document.getElementById('authStatus');
  if (div) {
    div.style.color = cor;
    div.textContent = msg;
  }
}

document.addEventListener('DOMContentLoaded', () => {

  const formLogin = document.getElementById('formLogin');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      mostrarStatus("Autenticando...", '#ffffff');

      const email = document.getElementById('loginEmail').value;
      const senha = document.getElementById('loginSenha').value;

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (response.ok) {
          mostrarStatus("Login realizado! Redirecionando...", '#00e054');
          setTimeout(() => {
            window.location.href = '/'; 
          }, 1000);
        } else {
          mostrarStatus(data.error || "Erro ao entrar.");
        }
      } catch (err) {
        mostrarStatus("Erro de conexão.");
      }
    });
  }

  const formCadastro = document.getElementById('formCadastro');
  if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
      e.preventDefault();
      mostrarStatus("Criando conta...", '#ffffff');

      const nome = document.getElementById('cadNome').value;
      const email = document.getElementById('cadEmail').value;
      const senha = document.getElementById('cadSenha').value;

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, email, senha })
        });

        const data = await response.json();

        if (response.ok) {
          mostrarStatus("Conta criada com sucesso! Redirecionando...", '#00e054');
          setTimeout(() => {
            window.location.href = '/'; 
          }, 1500);
        } else {
          mostrarStatus(data.error || "Erro ao cadastrar.");
        }
      } catch (err) {
        mostrarStatus("Erro de conexão.");
      }
    });
  }
});