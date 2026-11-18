import { store } from '../store.js?v=15';
import { api } from '../api.js?v=15';
import { esc, statusBadge, formatDate, monthLabel, emptyState, countUp, donutChart, trendChart, avatar } from '../ui.js?v=15';
import { mascotSvg, mascotMood, MASCOT_LINES } from '../mascot.js?v=15';

function shiftMonth(offset) {
  const [year, month] = store.month.split('-').map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  store.month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  window.dispatchEvent(new CustomEvent('cuco:refresh'));
}

function calendar(summary) {
  const [year, month] = summary.month.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month - 1, 1 - offset);
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  let cells = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((name) => `<div class="calendar-dow">${name}</div>`).join('');

  for (let index = 0; index < 42; index += 1) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const events = summary.byDay[iso] || [];
    const other = day.getMonth() !== month - 1;
    const eventHtml = events.slice(0, 2).map((event) => {
      const kind = ['falta', 'troca'].includes(event.status) ? event.status : '';
      return `<div class="day-event ${kind}" title="${esc(event.member_name + ' · ' + event.title)}">${esc(event.member_name.split(' ')[0])} ${esc(event.start_time)}</div>`;
    }).join('');
    cells += `<div class="day ${other ? 'other' : ''} ${iso === todayISO ? 'today' : ''}">
      <span class="day-number">${day.getDate()}</span>
      <div class="day-events">${eventHtml}${events.length > 2 ? `<span class="day-more">+${events.length - 2}</span>` : ''}</div>
    </div>`;
  }
  return `<div class="calendar">${cells}</div>`;
}

function statCard(value, label, icon, suffix = '') {
  return `<div class="card stat-card"><div class="stat-icon">${icon}</div>
    <div class="stat-value tnum" data-count="${value}" data-suffix="${suffix}">0${suffix}</div>
    <div class="stat-label">${esc(label)}</div></div>`;
}

function upcoming(list) {
  if (!list.length) return emptyState('Nada por vir', 'Nenhuma escala futura confirmada.');
  return `<div class="mini-list">${list.map((item) => {
    const date = new Date(`${item.date}T12:00:00`);
    return `<div class="mini-item">
      <div class="mini-date">${String(date.getDate()).padStart(2, '0')}<small>${date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></div>
      <div class="flex-1"><strong>${esc(item.member_name)}</strong><small>${esc(item.title)} · ${esc(item.start_time)}–${esc(item.end_time)}</small></div>
      ${statusBadge(item.status)}
    </div>`;
  }).join('')}</div>`;
}

function adminView(summary) {
  const stats = summary.stats;
  const top = summary.byMember.slice(0, 5);
  const max = Math.max(1, ...top.map((item) => item.count));
  return `<div class="stack">
    <section class="hero">
      <div class="hero-mascot">${mascotSvg(mascotMood(summary))}</div>
      <div><span class="hero-badge">● OPERAÇÃO ATIVA</span><h2>Olá, ${esc(store.user.name.split(' ')[0])}.</h2>
        <p>${MASCOT_LINES[mascotMood(summary)]}</p></div>
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Ações rápidas</h2><p>Atalhos para o dia a dia</p></div>
        <button class="btn btn-outline btn-sm" id="refresh-dashboard" type="button">↻ Atualizar</button></div>
      <div class="row">
        <button class="btn btn-primary btn-sm" data-go="shifts" type="button">＋ Nova escala</button>
        <button class="btn btn-ghost btn-sm" data-go="team" type="button">＋ Novo integrante</button>
        <button class="btn btn-ghost btn-sm" data-go="users" type="button">＋ Novo usuário</button>
        <button class="btn btn-ghost btn-sm" data-go="compliance" type="button">Ver conformidade</button>
        <button class="btn btn-ghost btn-sm" data-go="audit" type="button">Ver auditoria</button>
      </div>
    </section>
    <section class="grid grid-stats">
      ${statCard(stats.shifts, `Escalas em ${monthLabel(store.month)}`, '▦')}
      ${statCard(stats.hours, 'Horas planejadas', '◷', 'h')}
      ${statCard(stats.completion, 'Taxa de conclusão', '✓', '%')}
      ${statCard(stats.members, 'Integrantes ativos', '☺')}
    </section>
    <section class="analytics">
      <div class="card"><div class="card-head"><div><h2>Distribuição</h2><p>Status das escalas do mês</p></div></div>
        ${donutChart(summary.statusCounts, stats.shifts)}</div>
      <div class="card"><div class="card-head"><div><h2>Ritmo semanal</h2><p>Escalas por dia da semana</p></div></div>
        ${trendChart(summary.weekdayTrend)}</div>
      <div class="card"><div class="card-head"><div><h2>Carga por integrante</h2><p>Escalas e horas no mês</p></div></div>
        ${top.length ? top.map((item) => `<div class="bar-row"><span class="strong">${esc(item.name.split(' ')[0])}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round(item.count / max * 100)}%"></div></div>
          <span class="bar-value">${item.count}</span></div>`).join('') : emptyState('Sem dados', 'Cadastre escalas para ver a distribuição.')}</div>
    </section>
    ${store.compliance?.counts?.critical ? `<section class="card">
      <div class="card-head"><div><h2>Conformidade da escala</h2>
        <p>${store.compliance.counts.critical} apontamento(s) crítico(s) · limite semanal ${store.compliance.weeklyLimit}h</p></div>
        <button class="btn btn-ghost btn-sm" data-go="compliance" type="button">Analisar</button></div>
      <div class="mini-list">${store.compliance.issues.filter((item) => item.severity === 'critical').slice(0, 3).map((item) =>
        `<div class="mini-item"><div class="mini-date">!</div><div class="flex-1"><strong>${esc(item.member)}</strong><small>${esc(item.message)}</small></div></div>`).join('')}</div>
    </section>` : ''}

    <section class="grid grid-side">
      <div class="card"><div class="card-head">
        <div><h2>Calendário de escalas</h2><p>${monthLabel(store.month)} · ${stats.shifts} escalas</p></div>
        <div class="row"><button class="icon-btn" data-month="-1" type="button" aria-label="Mês anterior">‹</button>
          <button class="btn btn-ghost btn-sm" data-month="0" type="button">Hoje</button>
          <button class="icon-btn" data-month="1" type="button" aria-label="Próximo mês">›</button></div>
      </div>${calendar(summary)}</div>
      <div class="stack">
        <div class="card"><div class="card-head"><div><h2>Próximas escalas</h2><p>Ordem das próximas entradas</p></div></div>${upcoming(summary.upcoming)}</div>
        ${summary.attention.length ? `<div class="card"><div class="card-head"><div><h2>Precisa de atenção</h2><p>${summary.attention.length} item(ns)</p></div></div>
          ${summary.attention.map((item) => `<div class="mini-item"><div class="mini-date">${String(new Date(item.date + 'T12:00:00').getDate()).padStart(2, '0')}</div>
            <div><strong>${esc(item.member_name)}</strong><small>${esc(item.title)} · ${formatDate(item.date)}</small></div>${statusBadge(item.status)}</div>`).join('')}</div>` : ''}
      </div>
    </section>
  </div>`;
}

function employeeView(summary) {
  const { shifts: mine, stats } = store.myShifts;
  const member = store.members.find((item) => item.id === store.user.member_id)
    || (stats.next ? { name: stats.next.member_name } : null);
  const mood = mascotMood(summary);
  return `<div class="stack">
    <section class="shift-hero">
      <div><h2>Olá, ${esc(store.user.name.split(' ')[0])}! 👋</h2>
        <p>${member ? `Você está vinculado a ${esc(member.name)}. Acompanhe sua escala e confirme seus turnos.` : 'Acompanhe suas próximas escalas.'}</p></div>
      <div style="width:86px;height:86px">${mascotSvg(mood)}</div>
    </section>
    <section class="grid grid-stats">
      ${statCard(stats.total || 0, 'Próximas escalas', '▦')}
      ${statCard(stats.hours || 0, 'Horas na escala', '◷', 'h')}
      ${statCard(stats.confirmed || 0, 'Turnos confirmados', '✓')}
      ${statCard(store.settings.alert_days || 3, 'Dias de aviso', '◔')}
    </section>
    <section class="grid grid-side">
      <div class="card"><div class="card-head"><div><h2>Minha escala</h2><p>Próximos turnos · confirme sua presença</p></div></div>
        ${mine.length ? mine.map((shift) => {
          const date = new Date(`${shift.date}T12:00:00`);
          return `<div class="my-shift">
            <div class="my-shift-date">${String(date.getDate()).padStart(2, '0')}<small>${date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></div>
            <div class="my-shift-info"><strong>${esc(shift.title)}</strong><small>${esc(shift.start_time)} – ${esc(shift.end_time)} · ${formatDate(shift.date, true)}</small></div>
            ${statusBadge(shift.status)}
            ${shift.status !== 'confirmado' ? `<button class="btn btn-ghost btn-sm" data-confirm="${shift.id}" type="button">Confirmar</button>` : '<span class="small muted">Confirmado</span>'}
          </div>`;
        }).join('') : emptyState('Nenhuma escala futura', 'Quando uma escala for publicada, ela aparece aqui.')}
      </div>
      <div class="stack">
        <div class="card"><div class="card-head"><div><h2>Próximo turno</h2><p>Seu próximo compromisso</p></div></div>
          ${stats.next ? `<div class="my-shift">
            <div class="my-shift-date">${String(new Date(stats.next.date + 'T12:00:00').getDate()).padStart(2, '0')}</div>
            <div class="my-shift-info"><strong>${esc(stats.next.title)}</strong><small>${esc(stats.next.start_time)} – ${esc(stats.next.end_time)} · ${formatDate(stats.next.date)}</small></div>
            ${statusBadge(stats.next.status)}</div>` : emptyState('Sem próximo turno', 'Você está em dia.')}
        </div>
        <div class="card"><div class="card-head"><div><h2>Meu perfil</h2><p>Dados da sua conta</p></div></div>
          <div class="row">${avatar(store.user, '#1E8A4C', store.user.name)}<div><strong>${esc(store.user.name)}</strong><small class="muted">@${esc(store.user.login)}</small></div></div>
          <p class="form-note">Clique no seu avatar no topo para trocar foto ou senha.</p>
        </div>
      </div>
    </section>
  </div>`;
}

export function render() {
  if (!store.summary) return '<div class="card">Carregando…</div>';
  return store.user.role === 'admin' ? adminView(store.summary) : employeeView(store.summary);
}

export function mount() {
  document.querySelectorAll('[data-count]').forEach((element) => {
    countUp(element, element.dataset.count, element.dataset.suffix);
  });
  document.querySelectorAll('[data-go]').forEach((button) => {
    button.addEventListener('click', () => { window.location.hash = button.dataset.go; });
  });
  document.getElementById('refresh-dashboard')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cuco:refresh'));
  });
  document.querySelectorAll('[data-confirm]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await api.put(`/api/my-shifts/${button.dataset.confirm}/confirm`, {});
        window.dispatchEvent(new CustomEvent('cuco:toast', { detail: { message: 'Turno confirmado com sucesso' } }));
        window.dispatchEvent(new CustomEvent('cuco:refresh'));
      } catch (error) {
        window.dispatchEvent(new CustomEvent('cuco:toast', { detail: { message: error.message, type: 'error' } }));
      }
    });
  });
  document.querySelectorAll('[data-month]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = Number(button.dataset.month);
      if (value === 0) {
        store.month = new Date().toISOString().slice(0, 7);
        window.dispatchEvent(new CustomEvent('cuco:refresh'));
      } else shiftMonth(value);
    });
  });
}
