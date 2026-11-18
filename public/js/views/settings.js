import { store } from '../store.js?v=19';
import { api } from '../api.js?v=19';
import { esc, toast } from '../ui.js?v=19';

export function render() {
  const s = store.settings;
  return `<div class="grid grid-side">
    <section class="card">
      <div class="card-head"><div><h2>Formulário de configurações</h2><p>Ajustes gerais salvos no banco local.</p></div></div>
      <form id="settings-form" class="form-grid">
        <div class="field"><label for="s-company">Nome da empresa</label><input id="s-company" name="company_name" value="${esc(s.company_name)}"></div>
        <div class="field"><label for="s-email">E-mail de contato</label><input id="s-email" name="contact_email" type="email" value="${esc(s.contact_email)}"></div>
        <div class="field"><label for="s-start">Horário padrão de início</label><input id="s-start" name="default_start" type="time" value="${esc(s.default_start)}"></div>
        <div class="field"><label for="s-end">Horário padrão de término</label><input id="s-end" name="default_end" type="time" value="${esc(s.default_end)}"></div>
        <div class="field full"><label for="s-alert">Dias de aviso antes da escala</label><input id="s-alert" name="alert_days" type="number" min="0" max="999" value="${esc(s.alert_days)}"></div>
        <div class="field full form-actions"><button class="btn btn-primary" type="submit">Salvar configurações</button></div>
      </form>
    </section>

    <div class="stack">
      <section class="card">
        <div class="card-head"><div><h2>Banco de dados</h2><p>Armazenamento local do Cuco</p></div></div>
        <p class="small muted">Arquivo: <strong>data/cuco.db</strong></p>
        <p class="small muted" style="margin-top:8px">Tabelas: integrantes, escalas e configurações. Os dados persistem entre reinícios e podem ser copiados junto com a pasta para publicar.</p>
      </section>
      <section class="card">
        <div class="card-head"><div><h2>Para colocar no ar</h2><p>Passos rápidos de publicação</p></div></div>
        <ol class="small muted" style="padding-left:18px;line-height:1.9">
          <li>Rode <strong>npm start</strong> na pasta do projeto.</li>
          <li>Use um proxy reverso (Nginx/Caddy) apontando para a porta 3000.</li>
          <li>Configure <strong>PORT</strong> e <strong>HOST</strong> por variáveis de ambiente.</li>
          <li>Faça backup periódico de <strong>data/cuco.db</strong>.</li>
        </ol>
      </section>
      <section class="card">
        <div class="card-head"><div><h2>API disponível</h2><p>Endpoints para integrações</p></div></div>
        <p class="small muted">GET /api/health · /api/members · /api/shifts · /api/summary · /api/settings<br>POST /api/members · /api/shifts<br>PUT /api/members/:id · /api/shifts/:id · /api/settings<br>DELETE /api/members/:id · /api/shifts/:id</p>
      </section>
    </div>
  </div>`;
}

export function mount() {
  document.getElementById('settings-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      store.settings = await api.put('/api/settings', data);
      toast('Configurações salvas');
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
    } catch (error) {
      toast(error.message, 'error');
    }
  });
}
