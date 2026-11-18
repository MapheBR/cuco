import { store } from '../store.js?v=16';
import { esc, emptyState, toast } from '../ui.js?v=16';

let severityFilter = 'all';

const RULES = {
  'jornada-semanal': 'Jornada semanal',
  'descanso-semanal': 'Repouso semanal',
  interjornada: 'Descanso entre turnos',
  sobreposicao: 'Turnos sobrepostos',
  'horas-extras': 'Horas extras',
  intervalo: 'Intervalo intrajornada',
};

function table() {
  const data = store.compliance;
  const issues = (data?.issues || []).filter((issue) => severityFilter === 'all' || issue.severity === severityFilter);
  if (!issues.length) return emptyState('Nenhum apontamento', 'Nenhum item para o filtro selecionado.');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Severidade</th><th>Regra</th><th>Integrante</th><th>Data</th><th>Apontamento</th></tr></thead>
    <tbody>${issues.map((issue) => {
      const badge = issue.severity === 'critical' ? 'falta' : issue.severity === 'warning' ? 'troca' : 'planejado';
      return `<tr><td><span class="badge badge-${badge}">${issue.severity === 'critical' ? 'Crítico' : issue.severity === 'warning' ? 'Atenção' : 'Info'}</span></td>
        <td class="strong">${RULES[issue.rule] || esc(issue.rule)}</td>
        <td>${esc(issue.member)}</td><td class="nowrap small">${esc(issue.date)}</td>
        <td class="small muted">${esc(issue.message)}</td></tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

export function render() {
  const data = store.compliance;
  if (!data) return '<div class="card">Carregando…</div>';
  return `<div class="stack">
    <section class="grid grid-stats">
      <div class="card stat-card"><div class="stat-icon">!</div><div class="stat-value tnum">${data.counts.critical}</div><div class="stat-label">Apontamentos críticos</div></div>
      <div class="card stat-card"><div class="stat-icon">◔</div><div class="stat-value tnum">${data.counts.warning}</div><div class="stat-label">Atenção</div></div>
      <div class="card stat-card"><div class="stat-icon">i</div><div class="stat-value tnum">${data.counts.info}</div><div class="stat-label">Informativos</div></div>
      <div class="card stat-card"><div class="stat-icon">◷</div><div class="stat-value tnum">${data.weeklyLimit}h</div><div class="stat-label">Limite semanal vigente</div></div>
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Validador de escala</h2>
        <p>${data.month} · ${data.total} apontamento(s) · regra geral: 2 dias de repouso semanal</p></div>
        <div class="row"><select class="quick-status" id="compliance-severity" aria-label="Filtrar severidade">
          <option value="all" ${severityFilter === 'all' ? 'selected' : ''}>Todos</option>
          <option value="critical" ${severityFilter === 'critical' ? 'selected' : ''}>Críticos</option>
          <option value="warning" ${severityFilter === 'warning' ? 'selected' : ''}>Atenção</option>
          <option value="info" ${severityFilter === 'info' ? 'selected' : ''}>Informativos</option>
        </select>
        <button class="btn btn-outline btn-sm" id="export-compliance" type="button">⬇ Exportar CSV</button></div></div>
      <p class="form-note">Apontamentos automáticos, não constituem parecer jurídico. Regras em transição: 42 h semanais desde 16/12/2026 e 40 h desde 16/12/2027 (EC 141/2026).</p>
      ${table()}
    </section>
  </div>`;
}

export function mount() {
  document.getElementById('compliance-severity').addEventListener('change', (event) => {
    severityFilter = event.target.value;
    window.dispatchEvent(new CustomEvent('cuco:refresh'));
  });
  document.getElementById('export-compliance').addEventListener('click', () => {
    const lines = store.compliance.issues.map((item) => [item.severity, item.rule, item.member, item.date, item.message]
      .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob(['\uFEFF' + ['Severidade;Regra;Integrante;Data;Mensagem', ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cuco-conformidade-${store.compliance.month}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast('CSV exportado');
  });
}
