import { store } from '../store.js?v=19';
import { api } from '../api.js?v=19';
import { esc, emptyState, toast, modal, closeModal } from '../ui.js?v=19';

const LABEL = { aberto: 'Aberto', em_andamento: 'Em andamento', fechado: 'Fechado' };
const BADGE = { aberto: 'planejado', em_andamento: 'troca', fechado: 'confirmado' };

function table() {
  if (!store.tickets.length) return emptyState('Nenhum chamado', 'Abra um chamado para o setor responsável.');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Chamado</th><th>Setor</th><th>Solicitante</th><th>Prioridade</th><th>Status</th><th></th></tr></thead>
    <tbody>${store.tickets.map((ticket) => `<tr>
      <td><strong>${esc(ticket.title)}</strong><br><small class="muted">${esc(ticket.description || '')}</small></td>
      <td class="small">${esc(ticket.department_name || 'Geral')}</td>
      <td class="small">${esc(ticket.creator_name || '—')}</td>
      <td><span class="badge badge-${ticket.priority === 'alta' ? 'falta' : 'planejado'}">${esc(ticket.priority)}</span></td>
      <td>${store.user?.role === 'admin' ? `<select class="quick-status" data-ticket-status="${ticket.id}">
        ${Object.entries(LABEL).map(([value, label]) => `<option value="${value}" ${ticket.status === value ? 'selected' : ''}>${label}</option>`).join('')}
      </select>` : `<span class="badge badge-${BADGE[ticket.status] || 'planejado'}">${LABEL[ticket.status] || ticket.status}</span>`}</td>
      <td><button class="btn btn-ghost btn-sm" data-ticket-thread="${ticket.id}" type="button">💬 ${ticket.messages}</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

async function openThread(id) {
  try {
    const rows = await api.get(`/api/tickets/${id}/messages`);
    modal('Conversa do chamado', `<div class="mini-list">${rows.length
      ? rows.map((row) => `<div class="mini-item"><div class="flex-1"><strong>${esc(row.user_name || 'Usuário')}</strong>
          <small>${esc(row.message)}</small></div></div>`).join('')
      : '<p class="small muted">Nenhuma mensagem ainda.</p>'}</div>
      <form id="ticket-message-form" class="form-grid" style="margin-top:14px">
        <div class="field full"><label>Nova mensagem</label><textarea name="message" required placeholder="Escreva para o setor responsável"></textarea></div>
        <div class="field full form-actions"><button class="btn btn-primary" type="submit">Enviar mensagem</button>
          <button class="btn btn-outline" data-close-modal type="button">Fechar</button></div>
      </form>`);
    document.getElementById('ticket-message-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await api.post(`/api/tickets/${id}/messages`, Object.fromEntries(new FormData(event.currentTarget)));
        closeModal();
        toast('Mensagem enviada');
        window.dispatchEvent(new CustomEvent('cuco:refresh'));
      } catch (error) { toast(error.message, 'error'); }
    });
  } catch (error) { toast(error.message, 'error'); }
}

export function render() {
  return `<div class="stack">
    <section class="card"><div class="card-head"><div><h2>Novo chamado</h2><p>Envie uma mensagem para um setor específico</p></div></div>
      <form id="ticket-form" class="form-grid">
        <div class="field full"><label>Título</label><input name="title" required minlength="3"></div>
        <div class="field full"><label>Descrição</label><textarea name="description"></textarea></div>
        <div class="field"><label>Setor</label><select name="department_id"><option value="">Geral</option>
          ${store.departments.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Prioridade</label><select name="priority">
          <option value="baixa">Baixa</option><option value="media" selected>Média</option><option value="alta">Alta</option></select></div>
        <div class="field full form-actions"><button class="btn btn-primary" type="submit">Abrir chamado</button></div>
      </form></section>
    <section class="card"><div class="card-head"><div><h2>Chamados</h2><p>${store.tickets.length} chamado(s)</p></div></div>${table()}</section>
  </div>`;
}

export function mount() {
  document.getElementById('ticket-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api.post('/api/tickets', Object.fromEntries(new FormData(event.currentTarget)));
      toast('Chamado aberto');
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
    } catch (error) { toast(error.message, 'error'); }
  });
  document.querySelectorAll('[data-ticket-status]').forEach((select) => {
    select.addEventListener('change', async () => {
      try {
        await api.put(`/api/tickets/${select.dataset.ticketStatus}`, { status: select.value });
        toast('Status atualizado');
        window.dispatchEvent(new CustomEvent('cuco:refresh'));
      } catch (error) { toast(error.message, 'error'); }
    });
  });
  document.querySelectorAll('[data-ticket-thread]').forEach((button) => {
    button.addEventListener('click', () => openThread(button.dataset.ticketThread));
  });
}
