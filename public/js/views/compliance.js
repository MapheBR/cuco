import { store } from '../store.js?v=19';
import { api } from '../api.js?v=19';
import { esc, emptyState, toast } from '../ui.js?v=19';

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
      <div class="card-head"><div><h2>Regras configuráveis</h2>
        <p>Adaptáveis por convenção ou categoria — ${esc(data.rules?.source || '')}</p></div></div>
      <form id="rules-form" class="form-grid">
        ${[['hoursBefore', 'Limite até 15/12/2026'], ['hours2026', 'Limite a partir de 16/12/2026'],
          ['hours2027', 'Limite a partir de 16/12/2027'], ['minRest', 'Descanso mínimo entre turnos (h)'],
          ['maxWorked7', 'Máx. dias trabalhados em 7'], ['maxDaily', 'Jornada diária padrão (h)'],
          ['overtime', 'Horas extras diárias (h)'], ['breakAfter', 'Intervalo após (h)']]
          .map(([key, label]) => `<div class="field"><label for="rule-${key}">${label}</label>
            <input id="rule-${key}" name="${key}" type="number" min="1" max="200" value="${esc(data.rules?.[key] ?? '')}"></div>`).join('')}
        <div class="field full"><label for="rule-source">Fonte da regra</label><input id="rule-source" name="source" value="${esc(data.rules?.source || '')}"></div>
        <div class="field full form-actions"><button class="btn btn-primary" type="submit">Salvar regras</button></div>
      </form>
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Dossiê de conformidade</h2>
        <p>Selo com hash SHA-256 e PDF para advogado, sindicato ou RT.</p></div>
        <div class="row">
          <button class="btn btn-ghost btn-sm" id="publish-month" type="button">Publicar selo do mês</button>
          <button class="btn btn-outline btn-sm" id="download-dossier" type="button">↓ Baixar dossiê PDF</button>
        </div></div>
        ${store.compliancePublished ? `<p class="small muted">Selo publicado por <strong>${esc(store.compliancePublished.author)}</strong> em ${esc(store.compliancePublished.created_at)} · hash <span class="tnum">${esc(store.compliancePublished.hash)}</span></p>`
          : '<p class="small muted">Este mês ainda não tem selo publicado.</p>'}
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

  document.getElementById('rules-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api.put('/api/compliance/rules', Object.fromEntries(new FormData(event.currentTarget)));
      toast('Regras salvas');
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  document.getElementById('publish-month').addEventListener('click', async () => {
    try {
      const result = await api.post('/api/compliance/publish', { month: store.compliance.month });
      toast(`Selo publicado: ${result.hash.slice(0, 12)}…`);
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  document.getElementById('download-dossier').addEventListener('click', async () => {
    try {
      const blob = await api.download(`/api/compliance/dossier?month=${store.compliance.month}`);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `cuco-dossie-${store.compliance.month}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      toast(error.message, 'error');
    }
  });
}
