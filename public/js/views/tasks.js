import { store } from '../store.js?v=22';
import { api } from '../api.js?v=22';
import { esc, emptyState, toast, modal, closeModal, confirmDelete } from '../ui.js?v=22';

const LABEL = { pendente: 'Pendente', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada' };

function table() {
  if (!store.tasks.length) return emptyState('Nenhuma tarefa', 'As tarefas atribuídas aparecem aqui.');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Tarefa</th><th>Responsável</th><th>Área</th><th>Prazo</th><th>Prioridade</th><th>Status</th><th></th></tr></thead>
    <tbody>${store.tasks.map((task) => `<tr>
      <td><strong>${esc(task.title)}</strong><br><small class="muted">${esc(task.description || '')}</small></td>
      <td class="small">${esc(task.assigned_name || task.team_name || '—')}</td>
      <td class="small">${esc(task.department_name || '—')}</td>
      <td class="small nowrap">${esc(task.due_date || '—')}</td>
      <td><span class="badge badge-${task.priority === 'alta' ? 'falta' : task.priority === 'baixa' ? 'planejado' : 'troca'}">${esc(task.priority)}</span></td>
      <td><select class="quick-status" data-task-status="${task.id}">
        ${Object.entries(LABEL).map(([value, label]) => `<option value="${value}" ${task.status === value ? 'selected' : ''}>${label}</option>`).join('')}
      </select></td>
      <td><div class="actions">
        <button class="icon-btn" data-task-comments="${task.id}" type="button" title="Comentários">💬 <small>${task.comments}</small></button>
        ${store.user?.role === 'admin' ? `<button class="icon-btn danger" data-task-delete="${task.id}" type="button" aria-label="Excluir">🗑</button>` : ''}
      </div></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

async function openComments(id) {
  try {
    const rows = await api.get(`/api/tasks/${id}/comments`);
    modal('Comentários da tarefa', `<div class="mini-list">${rows.length
      ? rows.map((row) => `<div class="mini-item"><div class="flex-1"><strong>${esc(row.user_name || 'Usuário')}</strong>
          <small>${esc(row.message)}</small></div></div>`).join('')
      : '<p class="small muted">Nenhum comentário.</p>'}</div>
      <form id="comment-form" class="form-grid" style="margin-top:14px">
        <div class="field full"><label>Novo comentário</label><textarea name="message" required placeholder="Escreva uma mensagem"></textarea></div>
        <div class="field full form-actions"><button class="btn btn-primary" type="submit">Enviar</button>
          <button class="btn btn-outline" data-close-modal type="button">Fechar</button></div>
      </form>`);
    document.getElementById('comment-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await api.post(`/api/tasks/${id}/comments`, Object.fromEntries(new FormData(event.currentTarget)));
        closeModal();
        toast('Comentário enviado');
        window.dispatchEvent(new CustomEvent('cuco:refresh'));
      } catch (error) { toast(error.message, 'error'); }
    });
  } catch (error) { toast(error.message, 'error'); }
}

export function render() {
  const form = store.user?.role === 'admin' ? `<section class="card">
    <div class="card-head"><div><h2>Nova tarefa</h2><p>Atribua a uma pessoa, equipe ou setor</p></div></div>
    <form id="task-form" class="form-grid">
      <div class="field full"><label>Título</label><input name="title" required minlength="3"></div>
      <div class="field full"><label>Descrição</label><textarea name="description"></textarea></div>
      <div class="field"><label>Responsável</label><select name="assigned_to"><option value="">Nenhum</option>
        ${(store.users || []).map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Equipe</label><select name="team_id"><option value="">Nenhuma</option>
        ${store.teams.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Setor</label><select name="department_id"><option value="">Nenhum</option>
        ${store.departments.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Prazo</label><input name="due_date" type="date"></div>
      <div class="field"><label>Prioridade</label><select name="priority">
        <option value="baixa">Baixa</option><option value="media" selected>Média</option><option value="alta">Alta</option></select></div>
      <div class="field full form-actions"><button class="btn btn-primary" type="submit">Criar tarefa</button></div>
    </form></section>` : '';
  return `<div class="stack">${form}
    <section class="card"><div class="card-head"><div><h2>Tarefas</h2><p>${store.tasks.length} tarefa(s)</p></div></div>${table()}</section>
  </div>`;
}

export function mount() {
  document.getElementById('task-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api.post('/api/tasks', Object.fromEntries(new FormData(event.currentTarget)));
      toast('Tarefa criada');
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
    } catch (error) { toast(error.message, 'error'); }
  });
  document.querySelectorAll('[data-task-status]').forEach((select) => {
    select.addEventListener('change', async () => {
      try {
        await api.put(`/api/tasks/${select.dataset.taskStatus}`, { status: select.value });
        toast('Status atualizado');
        window.dispatchEvent(new CustomEvent('cuco:refresh'));
      } catch (error) { toast(error.message, 'error'); }
    });
  });
  document.querySelectorAll('[data-task-comments]').forEach((button) => {
    button.addEventListener('click', () => openComments(button.dataset.taskComments));
  });
  document.querySelectorAll('[data-task-delete]').forEach((button) => {
    button.addEventListener('click', () => confirmDelete('esta tarefa', async () => {
      try {
        await api.del(`/api/tasks/${button.dataset.taskDelete}`);
        toast('Tarefa excluída');
        window.dispatchEvent(new CustomEvent('cuco:refresh'));
      } catch (error) { toast(error.message, 'error'); }
    }));
  });
}
