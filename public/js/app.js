import { store, loadMembers, loadUsers, loadAudit, loadCompliance, loadMyShifts, loadSummary, loadSettings, loadShifts } from './store.js?v=14';
import { api } from './api.js?v=14';
import { mascotSvg, mascotMood, initMascotInteractions } from './mascot.js?v=14';
import { loadingState, errorState, toast, confetti, modal, closeModal, photoField, bindPhotoField } from './ui.js?v=14';
import { mountLogin } from './views/login.js?v=14';
import * as dashboard from './views/dashboard.js?v=14';
import * as shifts from './views/shifts.js?v=14';
import * as team from './views/team.js?v=14';
import * as users from './views/users.js?v=14';
import * as audit from './views/audit.js?v=14';
import * as compliance from './views/compliance.js?v=14';
import * as settings from './views/settings.js?v=14';

const VIEWS = {
  dashboard: { module: dashboard, title: 'Visão geral', eyebrow: 'PAINEL' },
  shifts: { module: shifts, title: 'Escalas', eyebrow: 'OPERAÇÃO' },
  team: { module: team, title: 'Equipe', eyebrow: 'CADASTROS' },
  users: { module: users, title: 'Usuários', eyebrow: 'ACESSO' },
  compliance: { module: compliance, title: 'Conformidade', eyebrow: 'TRABALHO' },
  audit: { module: audit, title: 'Auditoria', eyebrow: 'SEGURANÇA' },
  settings: { module: settings, title: 'Configurações', eyebrow: 'SISTEMA' },
};

const viewRoot = document.getElementById('view');
const splash = document.getElementById('splash');
const loginScreen = document.getElementById('login-screen');
const appShell = document.getElementById('app');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function updateHeader() {
  document.getElementById('page-title').textContent = VIEWS[store.view].title;
  document.getElementById('eyebrow').textContent = VIEWS[store.view].eyebrow;
  const isAdmin = store.user?.role === 'admin';
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('hidden', !isAdmin && item.dataset.view !== 'dashboard');
    item.classList.toggle('active', item.dataset.view === store.view);
  });
}

function updateUserChip() {
  if (!store.user) return;
  document.getElementById('user-avatar').innerHTML = store.user.photo
    ? `<img src="${store.user.photo}" alt="">`
    : store.user.name.slice(0, 2).toUpperCase();
  document.getElementById('user-name').textContent = store.user.name;
  document.getElementById('user-role').textContent = store.user.role === 'admin' ? 'Administrador' : 'Funcionário';
}

async function loadViewData() {
  await loadSettings();
  if (store.view === 'dashboard') {
    if (store.user.role === 'admin') await Promise.all([loadMembers(), loadCompliance()]);
    await loadSummary();
    if (store.user.role !== 'admin') await loadMyShifts();
  } else if (store.view === 'shifts') await Promise.all([loadMembers(), loadShifts(), loadSummary()]);
  else if (store.view === 'team') await Promise.all([loadMembers(), loadSummary()]);
  else if (store.view === 'users') await Promise.all([loadUsers(), loadMembers()]);
  else if (store.view === 'audit') await loadAudit();
  else if (store.view === 'compliance') await loadCompliance();
}

async function refresh() {
  if (!store.user) return showLogin();
  if (store.user.role !== 'admin' && store.view !== 'dashboard') store.view = 'dashboard';
  const current = VIEWS[store.view];
  updateHeader();
  viewRoot.innerHTML = loadingState();
  try {
    await loadViewData();
    viewRoot.innerHTML = current.module.render();
    current.module.mount();
    updateHeader();
    updateUserChip();
  } catch (error) {
    console.error('[cuco] falha ao carregar a tela:', error);
    viewRoot.innerHTML = errorState(error.message);
  }
}

function go(view) {
  if (!VIEWS[view] || !store.user) return;
  if (store.user.role !== 'admin' && view !== 'dashboard') {
    toast('Seu perfil tem acesso apenas ao painel', 'error');
    return;
  }
  store.view = view;
  store.editingShift = null;
  store.editingMember = null;
  store.editingUser = null;
  if (window.location.hash !== `#${view}`) window.location.hash = view;
  refresh();
}

function openProfile() {
  const user = store.user;
  modal('Meu perfil', `<form id="profile-form" class="form-grid">
    <div class="field full"><label for="p-name">Nome</label><input id="p-name" name="name" value="${user.name}" required minlength="2"></div>
    <div class="field full"><label for="p-pass">Nova senha (opcional)</label><input id="p-pass" name="password" type="password" minlength="6" placeholder="Mínimo 6 caracteres"></div>
    ${photoField(user.photo)}
    <div class="field full form-actions"><button class="btn btn-primary" type="submit">Salvar perfil</button>
      <button class="btn btn-outline" data-close-modal type="button">Cancelar</button></div>
  </form>`);
  bindPhotoField();
  document.querySelector('.modal [data-close-modal]').addEventListener('click', closeModal);
  document.getElementById('profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      store.user = await api.put('/api/me/profile', Object.fromEntries(new FormData(event.currentTarget)));
      closeModal();
      updateUserChip();
      confetti();
      window.dispatchEvent(new CustomEvent('cuco:toast', { detail: { message: 'Perfil atualizado' } }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('cuco:toast', { detail: { message: error.message, type: 'error' } }));
    }
  });
}

function showLogin() {
  appShell.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  mountLogin(async (user) => {
    store.user = user;
    confetti();
    await enterApp();
  });
}

async function enterApp() {
  loginScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
  updateUserChip();
  const initial = window.location.hash.slice(1);
  store.view = VIEWS[initial] ? initial : 'dashboard';
  if (store.user.role !== 'admin') store.view = 'dashboard';
  await refresh();
}

document.getElementById('nav').addEventListener('click', (event) => {
  const button = event.target.closest('[data-view]');
  if (button) go(button.dataset.view);
});

document.getElementById('user-chip').addEventListener('click', openProfile);
document.getElementById('user-chip').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') openProfile();
});

document.getElementById('logout-button').addEventListener('click', async (event) => {
  event.stopPropagation();
  try { await api.post('/api/logout'); } catch { /* ignora */ }
  store.user = null;
  window.location.hash = '';
  showLogin();
});

window.addEventListener('hashchange', () => {
  const view = window.location.hash.slice(1);
  if (store.user && VIEWS[view] && view !== store.view) go(view);
});

window.addEventListener('cuco:unauthorized', () => {
  if (store.user) { store.user = null; showLogin(); }
});
window.addEventListener('cuco:refresh', refresh);
window.addEventListener('cuco:toast', (event) => toast(event.detail.message, event.detail.type));

const motionToggle = document.getElementById('motion-toggle');
const PAUSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';
const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"/></svg>';
function applyMotion(paused) {
  document.body.classList.toggle('animations-paused', paused);
  motionToggle.innerHTML = paused ? PLAY_ICON : PAUSE_ICON;
  motionToggle.title = paused ? 'Ativar animações' : 'Pausar animações';
  motionToggle.setAttribute('aria-label', motionToggle.title);
  localStorage.setItem('cuco-motion-paused', paused ? '1' : '0');
}
applyMotion(localStorage.getItem('cuco-motion-paused') === '1');
motionToggle.addEventListener('click', () => applyMotion(!document.body.classList.contains('animations-paused')));

document.getElementById('splash-mascot').innerHTML = mascotSvg('calmo');
document.getElementById('login-mascot').innerHTML = mascotSvg('calmo');
initMascotInteractions();

async function boot() {
  const steps = [
    ['Conectando ao banco local', '24%'],
    ['Verificando sua sessão', '55%'],
    ['Preparando o painel', '82%'],
    ['Pronto!', '100%'],
  ];
  for (const [text, width] of steps) {
    document.getElementById('splash-step').textContent = text;
    document.getElementById('splash-bar').style.width = width;
    await delay(260);
  }
  try {
    store.user = await api.get('/api/me');
    await enterApp();
  } catch {
    showLogin();
  }
  splash.classList.add('hidden');
}

boot();
