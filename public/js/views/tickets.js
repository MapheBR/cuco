import { store } from '../store.js?v=21';
import { api } from '../api.js?v=21';
import { esc, emptyState, toast, modal, closeModal } from '../ui.js?v=21';

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
    const [rows, calls] = await Promise.all([
      api.get(`/api/tickets/${id}/messages`), api.get(`/api/tickets/${id}/calls`),
    ]);
    modal('Conversa do chamado', `<h3>Pessoas chamadas</h3><div class="mini-list">${calls.length
      ? calls.map((call) => `<div class="mini-item"><div class="flex-1"><strong>${esc(call.user_name)}</strong>
          <small>${esc(call.status)}</small></div>
          ${call.user_id === store.user.id && call.status === 'pendente' ? `<div class="actions">
            <button class="btn btn-ghost btn-sm" data-call-accept="${call.id}" type="button">Aceitar</button>
            <button class="btn btn-outline btn-sm" data-call-reject="${call.id}" type="button">Recusar</button></div>` : ''}</div>`).join('')
      : '<p class="small muted">Ninguém foi chamado especificamente.</p>'}</div>
      <h3 style="margin-top:16px">Mensagens</h3><div class="mini-list">${rows.length
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
    const answer = (callId, status) => async () => {
      try {
        await api.put(`/api/tickets/${id}/calls/${callId}`, { status });
        closeModal();
        toast(status === 'aceito' ? 'Chamada aceita' : 'Chamada recusada');
        window.dispatchEvent(new CustomEvent('cuco:refresh'));
      } catch (error) { toast(error.message, 'error'); }
    };
    document.querySelectorAll('[data-call-accept]').forEach((button) => button.addEventListener('click', answer(button.dataset.callAccept, 'aceito')));
    document.querySelectorAll('[data-call-reject]').forEach((button) => button.addEventListener('click', answer(button.dataset.callReject, 'recusado')));
  } catch (error) { toast(error.message, 'error'); }
}

export function render() {
  return `<div class="stack">
    <section class="card"><div class="card-head"><div><h2>Novo chamado</h2><p>Envie uma mensagem para um setor específico</p></div></div>
      <form id="ticket-form" class="form-grid">
        <div class="field full"><label>Título</label><input name="title" required minlength="3"></div>
        <div class="field full"><label>Descrição</label><textarea name="description"></textarea></div>
        <div class="field"><label>Setor</label><select name="department_id" id="ticket-department"><option value="">Geral</option>
          ${store.departments.map((d) => `<option value="${d.id}" data-desc="${esc(d.description)}">${esc(d.name)}</option>`).join('')}</select></div>
        <div class="field full"><p class="form-note" id="ticket-sector-hint">Selecione um setor para ver a descrição.</p></div>
        <div class="field full"><label>Chamar pessoas específicas</label>
          <div class="row">${store.users.filter((u) => u.id !== store.user.id).map((u) => `<label class="badge badge-planejado" style="cursor:pointer">
            <input type="checkbox" name="user_ids" value="${u.id}" style="margin:0 6px 0 2px"> ${esc(u.name)}</label>`).join('') || '<span class="small muted">Nenhum outro usuário cadastrado.</span>'}</div></div>
        <div class="field"><label>Prioridade</label><select name="priority">
          <option value="baixa">Baixa</option><option value="media" selected>Média</option><option value="alta">Alta</option></select></div>
        <div class="field full form-actions"><button class="btn btn-primary" type="submit">Abrir chamado</button></div>
      </form></section>
    <section class="card"><div class="card-head"><div><h2>Chamados</h2><p>${store.tickets.length} chamado(s)</p></div></div>${table()}</section>
  </div>`;
}

export function mount() {
  const departmentSelect = document.getElementById('ticket-department');
  const hint = document.getElementById('ticket-sector-hint');
  const updateHint = () => {
    const option = departmentSelect.selectedOptions[0];
    hint.textContent = option?.dataset.desc ? option.dataset.desc : 'Selecione um setor para ver a descrição.';
  };
  departmentSelect.addEventListener('change', updateHint);
  updateHint();

  document.getElementById('ticket-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    data.user_ids = [...event.currentTarget.querySelectorAll('[name="user_ids"]:checked')].map((input) => Number(input.value));
    try {
      await api.post('/api/tickets', data);
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
