import { api } from './api.js?v=19';

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

export const STATUS_LABELS = {
  planejado: 'Planejado',
  confirmado: 'Confirmado',
  concluido: 'Concluído',
  falta: 'Falta',
  troca: 'Troca',
};

export function statusBadge(status) {
  return `<span class="badge badge-${esc(status)}">${STATUS_LABELS[status] || esc(status)}</span>`;
}

export function initials(name) {
  return String(name || '?').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function avatar(member, color, name, size = '') {
  const photo = member?.photo || '';
  const content = photo ? `<img src="${esc(photo)}" alt="">` : esc(initials(name));
  return `<span class="avatar ${size}" style="background:${esc(color || '#1E8A4C')}">${content}</span>`;
}

export function person(member) {
  if (!member) return '<span class="muted">—</span>';
  const color = member.member_color || member.color || '#1E8A4C';
  const name = member.member_name || member.name;
  return `<div class="person">
    ${avatar(member, color, name)}
    <span><strong>${esc(name)}</strong><small>${esc(member.role || 'Integrante')}</small></span>
  </div>`;
}

export function photoPreview(photo) {
  return photo
    ? `<img class="photo-preview" src="${esc(photo)}" alt="Foto">`
    : '<div class="photo-placeholder">📷</div>';
}

export function photoField(photo, inputId = 'photo-input') {
  return `<div class="field full">
    <label>Foto</label>
    <div class="photo-row">
      <div id="photo-preview-box">${photoPreview(photo)}</div>
      <div class="photo-actions">
        <label class="btn btn-ghost btn-sm" for="${inputId}">📷 Escolher foto</label>
        <input id="${inputId}" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
        <button class="btn btn-outline btn-sm" id="remove-photo" type="button">Remover</button>
        <span class="form-note">PNG, JPG, WebP ou GIF · até 2 MB</span>
      </div>
    </div>
    <input type="hidden" name="photo" id="photo-value" value="${esc(photo)}">
  </div>`;
}

export function bindPhotoField(inputId = 'photo-input') {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast('A imagem deve ter até 2 MB', 'error');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await api.upload(reader.result);
        document.getElementById('photo-value').value = result.url;
        document.getElementById('photo-preview-box').innerHTML = photoPreview(result.url);
        toast('Foto enviada com sucesso');
      } catch (error) {
        toast(error.message, 'error');
      }
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('remove-photo')?.addEventListener('click', () => {
    document.getElementById('photo-value').value = '';
    document.getElementById('photo-preview-box').innerHTML = photoPreview('');
  });
}

export function formatDate(date, withWeekday = false) {
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString('pt-BR', withWeekday
    ? { weekday: 'short', day: '2-digit', month: 'short' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function monthLabel(month) {
  const [year, number] = month.split('-').map(Number);
  return new Date(year, number - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function toast(message, type = 'success') {
  const root = document.getElementById('toast-root');
  const node = document.createElement('div');
  node.className = `toast ${type === 'error' ? 'error' : ''}`;
  node.textContent = message;
  root.append(node);
  setTimeout(() => node.remove(), 3500);
}

export function modal(title, content) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true">
    <div class="card-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close-modal type="button" aria-label="Fechar">✕</button></div>
    ${content}
  </div></div>`;
  root.querySelector('[data-close-modal]').addEventListener('click', closeModal);
  root.querySelector('.modal-backdrop').addEventListener('click', (event) => {
    if (event.target.classList.contains('modal-backdrop')) closeModal();
  });
  const dialog = root.querySelector('.modal');
  const focusables = () => [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')];
  focusables()[0]?.focus();
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') return closeModal();
    if (event.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
}

export function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

export function confirmDelete(label, onConfirm) {
  modal('Confirmar exclusão', `<p class="muted">Excluir <strong>${esc(label)}</strong>? Esta ação não pode ser desfeita.</p>
    <div class="form-actions"><button class="btn btn-danger" id="confirm-delete" type="button">Excluir</button>
    <button class="btn btn-outline" data-close-modal type="button">Cancelar</button></div>`);
  document.getElementById('confirm-delete').addEventListener('click', async () => {
    closeModal();
    await onConfirm();
  });
}

export const loadingState = () => '<div class="state"><div class="skeleton" style="width:60%;margin:0 auto 10px"></div><p class="small">Carregando dados do banco local…</p></div>';
export const emptyState = (title, hint) => `<div class="state"><strong>${esc(title)}</strong><p class="small">${esc(hint)}</p></div>`;
export const errorState = (message) => `<div class="state"><strong>Não foi possível carregar</strong><p class="small">${esc(message)}</p></div>`;

export function memberOptions(members, selected = '') {
  return members.map((member) => `<option value="${member.id}" ${String(member.id) === String(selected) ? 'selected' : ''}>${esc(member.name)}</option>`).join('');
}

export function statusOptions(selected = 'planejado') {
  return Object.entries(STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');
}

export function countUp(element, target, suffix = '') {
  if (!element) return;
  const end = Number(target) || 0;
  if (document.body.classList.contains('animations-paused')) {
    element.textContent = end + suffix;
    return;
  }
  const duration = 900;
  const start = performance.now();
  const step = (time) => {
    const progress = Math.min(1, (time - start) / duration);
    const eased = 1 - (1 - progress) ** 3;
    element.textContent = Math.round(end * eased) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function donutChart(counts, total) {
  const colors = ['#1E8A4C', '#F5B942', '#3D7DD1', '#D9534F'];
  const keys = ['planejado', 'confirmado', 'concluido', 'falta'];
  let acc = 0;
  const stops = keys.map((key, index) => {
    const from = acc;
    acc += total ? (counts[key] || 0) / total * 100 : 0;
    return `--p${index + 1}:${from.toFixed(2)}%;`;
  }).join('');
  const rate = total ? Math.round((counts.concluido || 0) / total * 100) : 0;
  const legend = keys.map((key, index) => `<div class="legend-row">
    <span class="legend-swatch" style="background:${colors[index]}"></span>
    <span>${STATUS_LABELS[key]}</span><strong>${counts[key] || 0}</strong></div>`).join('');
  return `<div class="donut-wrap">
    <div class="donut" style="${stops}"><div class="donut-center"><strong>${rate}%</strong><small>concluídas</small></div></div>
    <div class="legend">${legend}</div>
  </div>`;
}

export function trendChart(points) {
  const max = Math.max(1, ...points.map((item) => item.count));
  return `<div class="trend">${points.map((item, index) => `<div class="trend-col">
    <div class="trend-bar" style="height:${Math.max(4, item.count / max * 90)}px;animation-delay:${index * 60}ms" title="${item.count} escalas"></div>
    <small>${esc(item.day)}</small></div>`).join('')}</div>`;
}

export function actionTag(action) {
  const kind = action.includes('delete') || action.includes('falta') ? 'delete'
    : action.includes('update') || action.includes('settings') || action.includes('confirm') ? 'update'
      : action === 'login' || action === 'logout' ? 'login' : '';
  return `<span class="action-tag ${kind}">${esc(action)}</span>`;
}

export function confetti() {
  const colors = ['#1E8A4C', '#F5B942', '#3D7DD1', '#2FA463', '#FFFFFF'];
  for (let index = 0; index < 18; index += 1) {
    const piece = document.createElement('i');
    piece.className = 'confetti';
    piece.style.left = `${45 + Math.random() * 10}%`;
    piece.style.top = `${20 + Math.random() * 15}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty('--dx', `${(Math.random() - .5) * 320}px`);
    piece.style.animationDelay = `${Math.random() * 180}ms`;
    document.body.append(piece);
    setTimeout(() => piece.remove(), 1600);
  }
}
