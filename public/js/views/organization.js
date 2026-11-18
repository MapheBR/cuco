import { store } from '../store.js?v=24';
import { api } from '../api.js?v=24';
import { esc, toast, confirmDelete, emptyState } from '../ui.js?v=24';

function list(rows, kind, label) {
  if (!rows.length) return emptyState(`Nenhum ${label.toLowerCase()}`, `Cadastre o primeiro ${label.toLowerCase()} acima.`);
  return `<div class="mini-list">${rows.map((row) => `<div class="mini-item">
    <div class="flex-1"><strong>${esc(row.name)}</strong><small>${esc(row.description || (row.level ? `Nível ${row.level}` : ''))}</small></div>
    <button class="icon-btn danger" data-delete-${kind}="${row.id}" type="button" aria-label="Excluir">🗑</button>
  </div>`).join('')}</div>`;
}

export function render() {
  return `<div class="stack">
    <section class="grid grid-two">
      <div class="card"><div class="card-head"><div><h2>Setores</h2><p>Áreas para direcionar chamados e tarefas</p></div></div>
        <form id="department-form" class="form-grid">
          <div class="field full"><label>Nome</label><input name="name" required minlength="2" placeholder="Ex.: Operações"></div>
          <div class="field full"><label>Descrição</label><input name="description" placeholder="Opcional"></div>
          <div class="field full"><label>Responsável pelo setor</label><select name="responsible_user_id"><option value="">Nenhum</option>
            ${(store.users || []).map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select></div>
          <div class="field full form-actions"><button class="btn btn-primary" type="submit">Adicionar setor</button></div>
        </form>${list(store.departments.map((d) => ({
          ...d, description: [d.description, (store.users || []).find((u) => u.id === d.responsible_user_id)?.name]
            .filter(Boolean).join(' · Responsável: '),
        })), 'department', 'Setor')}</div>
      <div class="card"><div class="card-head"><div><h2>Cargos</h2><p>Separação de funções e níveis</p></div></div>
        <form id="position-form" class="form-grid">
          <div class="field"><label>Nome</label><input name="name" required minlength="2" placeholder="Ex.: Supervisor"></div>
          <div class="field"><label>Nível</label><input name="level" type="number" min="1" value="1"></div>
          <div class="field full"><label>Descrição</label><input name="description" placeholder="Opcional"></div>
          <div class="field full form-actions"><button class="btn btn-primary" type="submit">Adicionar cargo</button></div>
        </form>${list(store.positions, 'position', 'Cargo')}</div>
    </section>
    <section class="card"><div class="card-head"><div><h2>Equipes</h2><p>Grupos de trabalho por setor</p></div></div>
      <form id="team-form" class="form-grid">
        <div class="field"><label>Nome</label><input name="name" required minlength="2" placeholder="Ex.: Turno A"></div>
        <div class="field"><label>Setor</label><select name="department_id"><option value="">Nenhum</option>
          ${store.departments.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></div>
        <div class="field full"><label>Descrição</label><input name="description" placeholder="Opcional"></div>
        <div class="field full form-actions"><button class="btn btn-primary" type="submit">Adicionar equipe</button></div>
      </form>${list(store.teams, 'team', 'Equipe')}</section>
  </div>`;
}

export function mount() {
  const kinds = [
    ['department-form', 'departments', 'Setor'],
    ['position-form', 'positions', 'Cargo'],
    ['team-form', 'teams', 'Equipe'],
  ];
  for (const [formId, endpoint, label] of kinds) {
    document.getElementById(formId).addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await api.post(`/api/${endpoint}`, Object.fromEntries(new FormData(event.currentTarget)));
        toast(`${label} adicionado`);
        window.dispatchEvent(new CustomEvent('cuco:refresh'));
      } catch (error) {
        toast(error.message, 'error');
      }
    });
    const key = endpoint === 'departments' ? 'department' : endpoint === 'positions' ? 'position' : 'team';
    document.querySelectorAll(`[data-delete-${key}]`).forEach((button) => {
      button.addEventListener('click', () => confirmDelete(`este ${label.toLowerCase()}`, async () => {
        try {
          await api.del(`/api/${endpoint}/${button.dataset[`delete${key.charAt(0).toUpperCase()}${key.slice(1)}`]}`);
          toast(`${label} excluído`);
          window.dispatchEvent(new CustomEvent('cuco:refresh'));
        } catch (error) {
          toast(error.message, 'error');
        }
      }));
    });
  }
}
