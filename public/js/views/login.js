import { api } from '../api.js?v=24';

let mounted = false;
let successCallback = null;

export function mountLogin(onSuccess) {
  successCallback = onSuccess;
  if (mounted) return;
  mounted = true;
  const screen = document.getElementById('login-screen');
  const form = document.getElementById('login-form');
  const errorBox = document.getElementById('login-error');
  const button = document.getElementById('login-button');
  const password = document.getElementById('login-pass');

  const toggle = document.getElementById('password-toggle');
  const eye = toggle.innerHTML;
  const eyeOff = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.2A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.2 6.3A17 17 0 0 0 2 12s3.6 7 10 7c1.5 0 2.9-.4 4.1-1"/></svg>';
  toggle.addEventListener('click', () => {
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    toggle.innerHTML = visible ? eyeOff : eye;
    toggle.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.add('hidden');
    button.classList.add('loading');
    button.innerHTML = '<span class="spin"></span>Verificando...';
    try {
      const user = await api.post('/api/login', {
        login: document.getElementById('login-user').value,
        password: password.value,
        remember: document.getElementById('login-remember').checked,
      });
      successCallback(user);
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.remove('hidden');
      screen.classList.remove('shake');
      void screen.offsetWidth;
      screen.classList.add('shake');
    } finally {
      button.classList.remove('loading');
      button.textContent = 'Entrar no painel';
    }
  });
}
