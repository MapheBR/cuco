import { store } from '../store.js?v=33';
import { api } from '../api.js?v=33';
import { esc, avatar, toast, confirmDelete, emptyState, photoField, bindPhotoField } from '../ui.js?v=33';

const COLORS = [
  ['#1E8A4C', 'Verde'], ['#2E9E86', 'Verde-azulado'], ['#F2A93B', 'Dourado'],
  ['#4C7DD6', 'Azul'], ['#9B6BD6', 'Roxo'], ['#E5694F', 'Coral'],
];

function colorOptions(selected) {
  return COLORS.map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');
}

function form() {
  const edit = store.editingMember;
  const values = {
    name: edit?.name ?? '', role: edit?.role ?? '', email: edit?.email ?? '',
    color: edit?.color ?? '#1E8A4C', active: edit ? Boolean(edit.active) : true,
    photo: edit?.photo ?? '',
  };
  return `<form id="member-form" class="form-grid">
    <div class="field"><label for="m-name">Nome *</label><input id="m-name" name="name" value="${esc(values.name)}" placeholder="Nome completo" required></div>
    <div class="field"><label for="m-role">Cargo</label><input id="m-role" name="role" value="${esc(values.role)}" placeholder="Ex.: Recepcionista"></div>
    <div class="field"><label for="m-email">E-mail</label><input id="m-email" name="email" type="email" value="${esc(values.email)}" placeholder="nome@empresa.com"></div>
    <div class="field"><label for="m-color">Cor de identificação</label><select id="m-color" name="color">${colorOptions(values.color)}</select></div>
    ${photoField(values.photo)}
    <div class="field full check-field"><input id="m-active" name="active" type="checkbox" ${values.active ? 'checked' : ''}>
      <label for="m-active">Integrante ativo</label></div>
    <div class="field full form-actions">
      <button class="btn btn-primary" type="submit">${edit ? 'Salvar alterações' : 'Adicionar integrante'}</button>
      ${edit ? '<button class="btn btn-outline" id="cancel-member-edit" type="button">Cancelar edição</button>' : ''}
      <span class="form-note">* Campos obrigatórios</span>
    </div>
  </form>`;
}

function table() {
  const rows = store.members;
  if (!rows.length) return emptyState('Nenhum integrante', 'Cadastre alguém no formulário acima.');
  const counts = new Map((store.summary?.byMember || []).map((item) => [item.name, item.count]));
  return `<div class="table-wrap"><table>
    <thead><tr><th>Integrante</th><th>Cargo</th><th>Contato</th><th>Escalas no mês</th><th>Situação</th><th></th></tr></thead>
    <tbody>${rows.map((member) => `<tr>
      <td><div class="person">${avatar(member, member.color, member.name)}
        <span><strong>${esc(member.name)}</strong></span></div></td>
      <td>${esc(member.role || '—')}</td>
      <td class="small muted">${esc(member.email || '—')}</td>
      <td class="strong">${counts.get(member.name) ?? 0}</td>
      <td><span class="badge badge-${member.active ? 'ativo' : 'inativo'}">${member.active ? 'Ativo' : 'Inativo'}</span></td>
      <td><div class="actions">
        <button class="icon-btn" data-member-edit="${member.id}" type="button" title="Editar" aria-label="Editar">✎</button>
        <button class="icon-btn danger" data-member-delete="${member.id}" type="button" title="Excluir" aria-label="Excluir">🗑</button>
      </div></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

export function render() {
  return `<div class="stack">
    <section class="card">
      <div class="card-head"><div><h2>${store.editingMember ? 'Editar integrante' : 'Formulário de integrante'}</h2>
        <p>Cadastre quem participa da escala de trabalho.</p></div></div>
      ${form()}
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Tabela de equipe</h2><p>${store.members.length} integrante(s) cadastrado(s)</p></div></div>
      ${table()}
    </section>
  </div>`;
}

export function mount() {
  bindPhotoField();
  document.getElementById('member-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    data.active = form.elements.active.checked;
    try {
      if (store.editingMember) {
        await api.put(`/api/members/${store.editingMember.id}`, data);
        toast('Integrante atualizado');
        store.editingMember = null;
      } else {
        await api.post('/api/members', data);
        toast('Integrante adicionado');
      }
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  document.getElementById('cancel-member-edit')?.addEventListener('click', () => {
    store.editingMember = null;
    window.dispatchEvent(new CustomEvent('cuco:refresh'));
  });

  document.querySelectorAll('[data-member-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      store.editingMember = store.members.find((member) => member.id === Number(button.dataset.memberEdit));
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  document.querySelectorAll('[data-member-delete]').forEach((button) => {
    button.addEventListener('click', () => confirmDelete('este integrante (e suas escalas)', async () => {
      try {
        await api.del(`/api/members/${button.dataset.memberDelete}`);
        toast('Integrante excluído');
        window.dispatchEvent(new CustomEvent('cuco:refresh'));
      } catch (error) {
        toast(error.message, 'error');
      }
    }));
  });
}
