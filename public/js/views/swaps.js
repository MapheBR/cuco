import { store } from '../store.js?v=22';
import { api } from '../api.js?v=22';
import { esc, emptyState, toast } from '../ui.js?v=22';

const LABELS = { pendente: 'troca', aprovado: 'confirmado', recusado: 'falta' };

function table() {
  if (!store.swaps.length) return emptyState('Nenhuma troca solicitada', 'Quando um funcionário solicitar uma troca, ela aparece aqui.');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Data</th><th>Solicitante</th><th>Turno</th><th>Destino</th><th>Situação</th><th></th></tr></thead>
    <tbody>${store.swaps.map((swap) => `<tr>
      <td class="nowrap strong">${esc(swap.date)}</td>
      <td>${esc(swap.from_user_name)}</td>
      <td class="small">${esc(swap.title)} · ${esc(swap.start_time)}–${esc(swap.end_time)}</td>
      <td>${esc(swap.to_member_name)}</td>
      <td><span class="badge badge-${LABELS[swap.status] || 'planejado'}">${esc(swap.status)}</span></td>
      <td>${swap.status === 'pendente' ? `<div class="actions">
        <button class="btn btn-ghost btn-sm" data-swap-approve="${swap.id}" type="button">Aprovar</button>
        <button class="btn btn-outline btn-sm" data-swap-reject="${swap.id}" type="button">Recusar</button>
      </div>` : ''}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

export function render() {
  return `<div class="stack">
    <section class="card"><div class="card-head"><div><h2>Trocas de turno</h2>
      <p>${store.swaps.length} solicitação(ões) · aprovação do administrador</p></div></div>
      ${table()}
    </section>
  </div>`;
}

export function mount() {
  const review = (id, status) => async () => {
    try {
      await api.put(`/api/swaps/${id}`, { status });
      toast(status === 'aprovado' ? 'Troca aprovada' : 'Troca recusada');
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
    } catch (error) {
      toast(error.message, 'error');
    }
  };
  document.querySelectorAll('[data-swap-approve]').forEach((button) => {
    button.addEventListener('click', review(button.dataset.swapApprove, 'aprovado'));
  });
  document.querySelectorAll('[data-swap-reject]').forEach((button) => {
    button.addEventListener('click', review(button.dataset.swapReject, 'recusado'));
  });
}
