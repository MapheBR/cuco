import { store } from '../store.js?v=14';
import { api } from '../api.js?v=14';
import { esc, statusBadge, person, formatDate, toast, confirmDelete, emptyState, memberOptions, statusOptions } from '../ui.js?v=14';

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formValues() {
  const edit = store.editingShift;
  return {
    member_id: edit?.member_id ?? '',
    date: edit?.date ?? todayISO(),
    start_time: edit?.start_time ?? store.settings.default_start ?? '08:00',
    end_time: edit?.end_time ?? store.settings.default_end ?? '16:00',
    title: edit?.title ?? '',
    status: edit?.status ?? 'planejado',
    notes: edit?.notes ?? '',
  };
}

function form() {
  const values = formValues();
  const editing = Boolean(store.editingShift);
  return `<form id="shift-form" class="form-grid">
    <div class="field"><label for="f-member">Integrante *</label>
      <select id="f-member" name="member_id" required><option value="">Selecione…</option>${memberOptions(store.members, values.member_id)}</select></div>
    <div class="field"><label for="f-date">Data *</label><input id="f-date" name="date" type="date" value="${esc(values.date)}" required></div>
    <div class="field"><label for="f-start">Início *</label><input id="f-start" name="start_time" type="time" value="${esc(values.start_time)}" required></div>
    <div class="field"><label for="f-end">Término *</label><input id="f-end" name="end_time" type="time" value="${esc(values.end_time)}" required></div>
    <div class="field"><label for="f-title">Título do turno</label><input id="f-title" name="title" value="${esc(values.title)}" placeholder="Ex.: Turno da manhã"></div>
    <div class="field"><label for="f-status">Status</label><select id="f-status" name="status">${statusOptions(values.status)}</select></div>
    <div class="field full"><label for="f-notes">Observações</label><textarea id="f-notes" name="notes" placeholder="Detalhes, trocas ou avisos…">${esc(values.notes)}</textarea></div>
    <div class="field full form-actions">
      <button class="btn btn-primary" type="submit">${editing ? 'Salvar alterações' : 'Adicionar escala'}</button>
      ${editing ? '<button class="btn btn-outline" id="cancel-edit" type="button">Cancelar edição</button>' : ''}
      <span class="form-note">* Campos obrigatórios · gravado no banco local</span>
    </div>
  </form>`;
}

function filters() {
  const f = store.filters;
  return `<form id="filter-form" class="form-grid">
    <div class="field"><label for="q-from">De</label><input id="q-from" name="from" type="date" value="${esc(f.from)}"></div>
    <div class="field"><label for="q-to">Até</label><input id="q-to" name="to" type="date" value="${esc(f.to)}"></div>
    <div class="field"><label for="q-member">Integrante</label><select id="q-member" name="member"><option value="">Todos</option>${memberOptions(store.members, f.member)}</select></div>
    <div class="field"><label for="q-status">Status</label><select id="q-status" name="status"><option value="">Todos</option>${statusOptions(f.status)}</select></div>
    <div class="field full"><label for="q-q">Buscar</label><div class="search-box"><span>🔍</span>
      <input id="q-q" name="q" value="${esc(f.q)}" placeholder="Nome, título ou observação..."></div></div>
    <div class="field full form-actions">
      <button class="btn btn-ghost" type="submit">Aplicar filtros</button>
      <button class="btn btn-outline" id="clear-filters" type="button">Limpar</button>
    </div>
  </form>`;
}

function table() {
  const rows = store.shifts;
  if (!rows.length) return emptyState('Nenhuma escala encontrada', 'Ajuste os filtros ou cadastre uma nova escala no formulário.');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Data</th><th>Integrante</th><th>Turno</th><th>Horário</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows.map((shift) => `<tr>
      <td class="nowrap strong">${formatDate(shift.date)}</td>
      <td>${person(shift)}</td>
      <td>${esc(shift.title)}</td>
      <td class="nowrap">${esc(shift.start_time)} – ${esc(shift.end_time)}</td>
      <td><div class="stack-small">${statusBadge(shift.status)}
        <select class="quick-status" data-status="${shift.id}" aria-label="Alterar status">${statusOptions(shift.status)}</select></div></td>
      <td><div class="actions">
        <button class="icon-btn" data-edit="${shift.id}" type="button" title="Editar" aria-label="Editar">✎</button>
        <button class="icon-btn danger" data-delete="${shift.id}" type="button" title="Excluir" aria-label="Excluir">🗑</button>
      </div></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

export function render() {
  return `<div class="stack">
    <section class="card">
      <div class="card-head"><div><h2>${store.editingShift ? 'Editar escala' : 'Formulário de escala'}</h2>
        <p>${store.editingShift ? 'Atualize os campos e salve as alterações.' : 'Preencha os dados para adicionar uma escala.'}</p></div></div>
      ${form()}
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Filtros</h2><p>Refine a tabela abaixo</p></div></div>
      ${filters()}
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Tabela de escalas</h2><p>${store.shifts.length} registro(s) encontrado(s)</p></div>
        <button class="btn btn-outline btn-sm" id="export-csv" type="button">⬇ Exportar CSV</button></div>
      ${table()}
    </section>
  </div>`;
}

export function mount() {
  document.getElementById('shift-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    data.member_id = Number(data.member_id);
    try {
      if (store.editingShift) {
        await api.put(`/api/shifts/${store.editingShift.id}`, data);
        toast('Escala atualizada com sucesso');
        store.editingShift = null;
      } else {
        await api.post('/api/shifts', data);
        toast('Escala adicionada com sucesso');
      }
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  document.getElementById('cancel-edit')?.addEventListener('click', () => {
    store.editingShift = null;
    window.dispatchEvent(new CustomEvent('cuco:refresh'));
  });

  document.getElementById('filter-form').addEventListener('submit', (event) => {
    event.preventDefault();
    store.filters = Object.fromEntries(new FormData(event.currentTarget));
    window.dispatchEvent(new CustomEvent('cuco:refresh'));
  });

  document.getElementById('clear-filters').addEventListener('click', () => {
    store.filters = { from: '', to: '', member: '', status: '' };
    window.dispatchEvent(new CustomEvent('cuco:refresh'));
  });

  document.querySelectorAll('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      store.editingShift = store.shifts.find((shift) => shift.id === Number(button.dataset.edit));
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  document.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', () => confirmDelete('esta escala', async () => {
      try {
        await api.del(`/api/shifts/${button.dataset.delete}`);
        toast('Escala excluída');
        window.dispatchEvent(new CustomEvent('cuco:refresh'));
      } catch (error) {
        toast(error.message, 'error');
      }
    }));
  });

  document.querySelectorAll('[data-status]').forEach((select) => {
    select.addEventListener('change', async () => {
      try {
        await api.put(`/api/shifts/${select.dataset.status}`, { status: select.value });
        toast('Status atualizado');
        window.dispatchEvent(new CustomEvent('cuco:refresh'));
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  });

  document.getElementById('export-csv').addEventListener('click', () => {
    const header = ['Data', 'Integrante', 'Turno', 'Inicio', 'Fim', 'Status', 'Observacoes'];
    const lines = store.shifts.map((shift) => [
      shift.date, shift.member_name, shift.title, shift.start_time,
      shift.end_time, shift.status, shift.notes,
    ].map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob(['\uFEFF' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cuco-escalas-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast('CSV exportado');
  });
}
