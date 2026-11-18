import { store } from '../store.js?v=21';
import { api } from '../api.js?v=21';
import { esc, toast, emptyState } from '../ui.js?v=21';

const BADGE = { novo: 'planejado', usado: 'troca', aprovado: 'confirmado', recusado: 'falta' };

function table() {
  if (!store.invitations.length) return emptyState('Nenhum convite', 'Gere um código e compartilhe com o novo usuário.');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Código</th><th>Solicitante</th><th>Perfil</th><th>Vínculo</th><th>Validade</th><th>Status</th><th></th></tr></thead>
    <tbody>${store.invitations.map((invite) => `<tr>
      <td class="strong tnum">${esc(invite.code)}</td>
      <td>${esc(invite.user_name ? `${invite.user_name} (${invite.user_login})` : '—')}</td>
      <td>${esc(invite.role === 'admin' ? 'Administrador' : 'Funcionário')}</td>
      <td class="small">${esc(invite.team_name || invite.department_name || invite.member_name || '—')}</td>
      <td class="small nowrap">${esc(invite.expires_at)}</td>
      <td><span class="badge badge-${BADGE[invite.status] || 'planejado'}">${esc(invite.status)}</span></td>
      <td>${invite.status === 'usado' ? `<div class="actions">
        <button class="btn btn-ghost btn-sm" data-invite-approve="${invite.id}" type="button">Aprovar vínculo</button>
        <button class="btn btn-outline btn-sm" data-invite-reject="${invite.id}" type="button">Recusar</button>
      </div>` : ''}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

export function render() {
  return `<div class="stack">
    <section class="card"><div class="card-head"><div><h2>Gerar convite</h2>
      <p>O código vale 7 dias. O novo usuário informa o código no cadastro; você aprova o vínculo depois.</p></div></div>
      <form id="invite-form" class="form-grid">
        <div class="field"><label>Perfil</label><select name="role"><option value="user">Funcionário</option><option value="admin">Administrador</option></select></div>
        <div class="field"><label>Setor</label><select name="department_id"><option value="">Nenhum</option>
          ${store.departments.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Equipe</label><select name="team_id"><option value="">Nenhuma</option>
          ${store.teams.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Integrante</label><select name="member_id"><option value="">Nenhum</option>
          ${store.members.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select></div>
        <div class="field full form-actions"><button class="btn btn-primary" type="submit">Gerar código</button></div>
      </form>
      <div id="invite-result" class="hidden"></div>
    </section>
    <section class="card"><div class="card-head"><div><h2>Solicitações de vínculo</h2><p>${store.invitations.length} convite(s)</p></div></div>${table()}</section>
  </div>`;
}

export function mount() {
  document.getElementById('invite-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const result = await api.post('/api/invitations', Object.fromEntries(new FormData(event.currentTarget)));
      const box = document.getElementById('invite-result');
      box.classList.remove('hidden');
      box.innerHTML = `<div class="card" style="background:var(--green-50);margin-top:14px"><strong class="tnum" style="font-size:22px">${esc(result.code)}</strong>
        <p class="small muted">Válido até ${esc(result.expires_at)}. Envie este código ao novo usuário.</p></div>`;
      toast('Convite gerado');
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
    } catch (error) { toast(error.message, 'error'); }
  });

  const review = (id, action) => async () => {
    try {
      await api.put(`/api/invitations/${id}/${action}`, {});
      toast(action === 'approve' ? 'Vínculo aprovado' : 'Solicitação recusada');
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
    } catch (error) { toast(error.message, 'error'); }
  };
  document.querySelectorAll('[data-invite-approve]').forEach((button) => button.addEventListener('click', review(button.dataset.inviteApprove, 'approve')));
  document.querySelectorAll('[data-invite-reject]').forEach((button) => button.addEventListener('click', review(button.dataset.inviteReject, 'reject')));
}
