import { store } from '../store.js?v=33';
import { api } from '../api.js?v=33';
import { esc, avatar, toast, confirmDelete, emptyState, photoField, bindPhotoField, memberOptions } from '../ui.js?v=33';

function form() {
  const edit = store.editingUser;
  const values = {
    name: edit?.name ?? '', login: edit?.login ?? '', role: edit?.role ?? 'user',
    active: edit ? Boolean(edit.active) : true, photo: edit?.photo ?? '',
    member_id: edit?.member_id ?? '',
  };
  return `<form id="user-form" class="form-grid">
    <div class="field"><label for="u-name">Nome *</label><input id="u-name" name="name" value="${esc(values.name)}" placeholder="Nome completo" required></div>
    <div class="field"><label for="u-login">Login *</label><input id="u-login" name="login" value="${esc(values.login)}" placeholder="Ex.: maria" autocomplete="off" required></div>
    <div class="field"><label for="u-pass">Senha ${edit ? '(deixe em branco para manter)' : '*'}</label>
      <input id="u-pass" name="password" type="password" autocomplete="new-password" ${edit ? '' : 'required'} minlength="6" placeholder="Mínimo 6 caracteres"></div>
    <div class="field"><label for="u-role">Perfil</label><select id="u-role" name="role">
      <option value="user" ${values.role === 'user' ? 'selected' : ''}>Usuário</option>
      <option value="admin" ${values.role === 'admin' ? 'selected' : ''}>Administrador</option></select></div>
    <div class="field"><label for="u-member">Integrante vinculado</label>
      <select id="u-member" name="member_id"><option value="">Nenhum</option>${memberOptions(store.members, values.member_id)}</select></div>
    <div class="field full form-note">O vínculo define quais escalas o funcionário vê no painel dele.</div>
    ${photoField(values.photo)}
    <div class="field full check-field"><input id="u-active" name="active" type="checkbox" ${values.active ? 'checked' : ''}>
      <label for="u-active">Usuário ativo</label></div>
    <div class="field full form-actions">
      <button class="btn btn-primary" type="submit">${edit ? 'Salvar alterações' : 'Adicionar usuário'}</button>
      ${edit ? '<button class="btn btn-outline" id="cancel-user-edit" type="button">Cancelar edição</button>' : ''}
    </div>
  </form>`;
}

function table() {
  const rows = store.users;
  if (!rows.length) return emptyState('Nenhum usuário', 'Cadastre um usuário no formulário acima.');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Usuário</th><th>Login</th><th>Integrante</th><th>Perfil</th><th>Situação</th><th></th></tr></thead>
    <tbody>${rows.map((user) => `<tr>
      <td><div class="person">${avatar(user, '#1E8A4C', user.name)}
        <span><strong>${esc(user.name)}</strong><small>${user.id === store.user.id ? 'Você' : ''}</small></span></div></td>
      <td class="strong">${esc(user.login)}</td>
      <td class="small">${esc(store.members.find((member) => member.id === user.member_id)?.name || '—')}</td>
      <td><span class="badge badge-${user.role === 'admin' ? 'confirmado' : 'planejado'}">${user.role === 'admin' ? 'Admin' : 'Funcionário'}</span></td>
      <td><span class="badge badge-${user.active ? 'ativo' : 'inativo'}">${user.active ? 'Ativo' : 'Inativo'}</span></td>
      <td><div class="actions">
        <button class="icon-btn" data-user-edit="${user.id}" type="button" title="Editar" aria-label="Editar">✎</button>
        <button class="icon-btn danger" data-user-delete="${user.id}" type="button" title="Excluir" aria-label="Excluir">🗑</button>
      </div></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

export function render() {
  return `<div class="stack">
    <section class="card">
      <div class="card-head"><div><h2>${store.editingUser ? 'Editar usuário' : 'Formulário de usuário'}</h2>
        <p>Controle quem acessa o painel do Cuco.</p></div></div>
      ${form()}
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Tabela de usuários</h2><p>${store.users.length} usuário(s) cadastrado(s)</p></div></div>
      ${table()}
    </section>
  </div>`;
}

export function mount() {
  bindPhotoField();
  document.getElementById('user-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = Object.fromEntries(new FormData(formElement));
    data.active = formElement.elements.active.checked;
    if (!data.password) delete data.password;
    try {
      if (store.editingUser) {
        await api.put(`/api/users/${store.editingUser.id}`, data);
        toast('Usuário atualizado');
        store.editingUser = null;
      } else {
        await api.post('/api/users', data);
        toast('Usuário adicionado');
      }
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  document.getElementById('cancel-user-edit')?.addEventListener('click', () => {
    store.editingUser = null;
    window.dispatchEvent(new CustomEvent('cuco:refresh'));
  });

  document.querySelectorAll('[data-user-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      store.editingUser = store.users.find((user) => user.id === Number(button.dataset.userEdit));
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  document.querySelectorAll('[data-user-delete]').forEach((button) => {
    button.addEventListener('click', () => confirmDelete('este usuário', async () => {
      try {
        await api.del(`/api/users/${button.dataset.userDelete}`);
        toast('Usuário excluído');
        window.dispatchEvent(new CustomEvent('cuco:refresh'));
      } catch (error) {
        toast(error.message, 'error');
      }
    }));
  });
}
