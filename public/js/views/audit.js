import { store } from '../store.js?v=14';
import { api } from '../api.js?v=14';
import { esc, actionTag, emptyState, toast } from '../ui.js?v=14';

function table() {
  const rows = store.audit;
  if (!rows.length) return emptyState('Nenhuma atividade registrada', 'As ações do sistema aparecerão aqui.');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Detalhes</th><th>ID</th></tr></thead>
    <tbody>${rows.map((row) => `<tr>
      <td class="nowrap small tnum">${new Date(row.created_at.replace(' ', 'T') + 'Z').toLocaleString('pt-BR')}</td>
      <td class="strong">${esc(row.user_name)}</td>
      <td>${actionTag(row.action)}</td>
      <td class="small muted">${esc(row.detail || '—')}${row.ip ? `<br><span title="${esc(row.user_agent)}">${esc(row.ip)}</span>` : ''}</td>
      <td class="tnum muted">#${row.id}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

export function render() {
  return `<div class="stack">
    <section class="card">
      <div class="card-head"><div><h2>Trilha de auditoria</h2>
        <p>${store.audit.length} evento(s) recente(s) · somente administradores</p></div>
        <button class="btn btn-outline btn-sm" id="export-audit" type="button">⬇ Exportar CSV</button></div>
      <form id="audit-form" class="form-grid">
        <div class="field"><label for="a-q">Buscar ação ou usuário</label>
          <div class="search-box"><span>🔍</span><input id="a-q" name="q" value="${esc(store.auditFilters.q)}" placeholder="Ex.: login, shift.delete, Ana..."></div></div>
        <div class="field"><label for="a-limit">Limite de registros</label>
          <select id="a-limit" name="limit">${['50', '100', '300', '500'].map((value) => `<option value="${value}" ${store.auditFilters.limit === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div>
        <div class="field full form-actions"><button class="btn btn-ghost" type="submit">Filtrar</button></div>
      </form>
    </section>
    <section class="card">${table()}</section>
  </div>`;
}

export function mount() {
  document.getElementById('audit-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    store.auditFilters = Object.fromEntries(new FormData(event.currentTarget));
    try {
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
    } catch (error) {
      toast(error.message, 'error');
    }
  });
  document.getElementById('export-audit').addEventListener('click', () => {
    const lines = store.audit.map((row) => [row.created_at, row.user_name, row.action, row.detail]
      .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob(['\uFEFF' + ['Data;Usuario;Acao;Detalhes', ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cuco-auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}
