import { store } from '../store.js?v=20';
import { api } from '../api.js?v=20';
import { esc, toast, emptyState } from '../ui.js?v=20';

const isAdmin = () => store.user?.role === 'admin';

function arrow(a, b) {
  const x1 = a.x + a.w / 2;
  const y1 = a.y + a.h / 2;
  const x2 = b.x + b.w / 2;
  const y2 = b.y + b.h / 2;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 11;
  const px = x2 - Math.cos(angle) * 16;
  const py = y2 - Math.sin(angle) * 16;
  const left = `${px - Math.cos(angle - 0.5) * size},${py - Math.sin(angle - 0.5) * size}`;
  const right = `${px - Math.cos(angle + 0.5) * size},${py - Math.sin(angle + 0.5) * size}`;
  return `<line x1="${x1}" y1="${y1}" x2="${px}" y2="${py}" stroke="#F5B942" stroke-width="3" stroke-dasharray="8 6" marker-end="url(#arrow)"/>
    <polygon points="${px},${py} ${left} ${right}" fill="#F5B942"/>`;
}

function scene() {
  if (!store.zones.length) return emptyState('Mapa ainda não configurado', 'O administrador pode criar o layout padrão da loja.');
  const byZone = new Map();
  for (const place of store.locations) {
    if (place.zone_id) {
      if (!byZone.has(place.zone_id)) byZone.set(place.zone_id, []);
      byZone.get(place.zone_id).push(place);
    }
  }
  const zones = store.zones.map((zone) => {
    const people = byZone.get(zone.id) || [];
    const marks = people.map((person, index) => {
      const cx = zone.x + 34 + (index % 4) * 38;
      const cy = zone.y + zone.h - 30 - Math.floor(index / 4) * 38;
      return `<g><circle cx="${cx}" cy="${cy}" r="16" fill="#fff" stroke="${zone.color}" stroke-width="3"/>
        <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="11" font-weight="800" fill="#0E4B2B">${esc(person.user_name.split(' ').map((p) => p[0]).slice(0, 2).join(''))}</text>
        <title>${esc(person.user_name)}</title></g>`;
    }).join('');
    return `<g class="zone" data-zone="${zone.id}" style="cursor:${isAdmin() ? 'move' : 'default'}">
      <rect x="${zone.x}" y="${zone.y}" width="${zone.w}" height="${zone.h}" rx="14" fill="${zone.color}" fill-opacity=".16" stroke="${zone.color}" stroke-width="2"/>
      <text x="${zone.x + 14}" y="${zone.y + 26}" font-size="16" font-weight="800" fill="#0E4B2B">${esc(zone.name)}</text>
      <text x="${zone.x + 14}" y="${zone.y + 45}" font-size="11" fill="#5C7266">${people.length} pessoa(s)</text>
      ${marks}</g>`;
  }).join('');
  const flows = store.zoneFlows.map((flow) => {
    const from = store.zones.find((z) => z.id === flow.from_zone);
    const to = store.zones.find((z) => z.id === flow.to_zone);
    return from && to ? arrow(from, to) : '';
  }).join('');
  return `<div class="map-canvas"><svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa do local de trabalho">
    <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#F5B942"/></marker></defs>
    <rect width="1000" height="600" rx="18" fill="#F8FCF9" stroke="#E2EDE6"/>
    ${flows}${zones}
  </svg></div>`;
}

function presence() {
  const here = store.locations.find((item) => item.user_id === store.user.id);
  return `<div class="card"><div class="card-head"><div><h2>Onde você está</h2>
    <p>${here ? `Atualizado em ${new Date(here.updated_at.replace(' ', 'T') + 'Z').toLocaleString('pt-BR')}` : 'Informe sua localização atual'}</p></div></div>
    <div class="row">${store.zones.map((zone) => `<button class="btn ${here?.zone_id === zone.id ? 'btn-primary' : 'btn-ghost'} btn-sm" data-zone-here="${zone.id}" type="button">${esc(zone.name)}</button>`).join('')}</div>
    ${here?.note ? `<p class="small muted" style="margin-top:10px">${esc(here.note)}</p>` : ''}
  </div>`;
}

function distribution() {
  const counts = store.zones.map((zone) => ({
    zone, people: store.locations.filter((item) => item.zone_id === zone.id),
  }));
  return `<div class="card"><div class="card-head"><div><h2>Distribuição de trabalho</h2><p>Pessoas por área neste momento</p></div></div>
    ${counts.map(({ zone, people }) => `<div class="mini-item">
      <div class="legend-swatch" style="background:${zone.color}"></div>
      <div class="flex-1"><strong>${esc(zone.name)}</strong><small>${people.map((p) => esc(p.user_name)).join(', ') || 'Ninguém'}</small></div>
      <span class="badge badge-confirmado">${people.length}</span>
    </div>`).join('')}</div>`;
}

function adminTools() {
  if (!isAdmin()) return '';
  return `<section class="card"><div class="card-head"><div><h2>Configurar mapa</h2>
    <p>Arraste as áreas no mapa para reposicioná-las</p></div>
    <button class="btn btn-ghost btn-sm" id="default-layout" type="button">Criar layout padrão</button></div>
    <div class="form-grid">
      <div class="field"><label>Nova área</label><input id="zone-name" placeholder="Ex.: Vendas"></div>
      <div class="field"><label>Cor</label><input id="zone-color" type="color" value="#1E8A4C"></div>
      <div class="field"><label>Descrição</label><input id="zone-desc" placeholder="Opcional"></div>
      <div class="field"><label>Fluxo (de → para)</label><div class="row">
        <select id="flow-from">${store.zones.map((z) => `<option value="${z.id}">${esc(z.name)}</option>`).join('')}</select>
        <select id="flow-to">${store.zones.map((z) => `<option value="${z.id}">${esc(z.name)}</option>`).join('')}</select>
        <button class="btn btn-outline btn-sm" id="add-flow" type="button">Adicionar fluxo</button></div></div>
      <div class="field full form-actions"><button class="btn btn-primary" id="add-zone" type="button">Adicionar área</button></div>
    </div>
  </section>`;
}

export function render() {
  return `<div class="stack">
    <section class="card"><div class="card-head"><div><h2>Mapa do local de trabalho</h2>
      <p>${esc(store.settings.company_name || '')} · ${esc(store.settings.company_address || 'Endereço não informado')}</p></div></div>
      ${scene()}
    </section>
    ${presence()}
    ${distribution()}
    ${adminTools()}
  </div>`;
}

export function mount() {
  document.querySelectorAll('[data-zone-here]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await api.put('/api/locations/me', { zone_id: Number(button.dataset.zoneHere) });
        toast('Localização atualizada');
        window.dispatchEvent(new CustomEvent('cuco:refresh'));
      } catch (error) { toast(error.message, 'error'); }
    });
  });

  document.getElementById('default-layout')?.addEventListener('click', async () => {
    try {
      await api.post('/api/zones/default', {});
      toast('Layout padrão criado');
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
    } catch (error) { toast(error.message, 'error'); }
  });
  document.getElementById('add-zone')?.addEventListener('click', async () => {
    const name = document.getElementById('zone-name').value;
    if (!name.trim()) return toast('Informe o nome da área', 'error');
    try {
      await api.post('/api/zones', {
        name, color: document.getElementById('zone-color').value,
        description: document.getElementById('zone-desc').value,
        x: 40 + (store.zones.length % 3) * 300, y: 40 + Math.floor(store.zones.length / 3) * 180,
      });
      toast('Área adicionada');
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
    } catch (error) { toast(error.message, 'error'); }
  });
  document.getElementById('add-flow')?.addEventListener('click', async () => {
    try {
      await api.post('/api/zone-flows', {
        from_zone: Number(document.getElementById('flow-from').value),
        to_zone: Number(document.getElementById('flow-to').value),
      });
      toast('Fluxo adicionado');
      window.dispatchEvent(new CustomEvent('cuco:refresh'));
    } catch (error) { toast(error.message, 'error'); }
  });

  if (isAdmin() && store.zones.length) {
    const svg = document.querySelector('.map-canvas svg');
    let dragging = null;
    svg.querySelectorAll('[data-zone]').forEach((group) => {
      group.addEventListener('pointerdown', (event) => {
        const zone = store.zones.find((z) => z.id === Number(group.dataset.zone));
        dragging = { zone, startX: event.clientX, startY: event.clientY, x: zone.x, y: zone.y };
        group.setPointerCapture(event.pointerId);
      });
      group.addEventListener('pointermove', (event) => {
        if (!dragging || dragging.zone.id !== Number(group.dataset.zone)) return;
        const scale = 1000 / svg.getBoundingClientRect().width;
        dragging.zone.x = Math.max(0, Math.min(900, Math.round(dragging.x + (event.clientX - dragging.startX) * scale)));
        dragging.zone.y = Math.max(0, Math.min(520, Math.round(dragging.y + (event.clientY - dragging.startY) * scale)));
        const rect = group.querySelector('rect');
        rect.setAttribute('x', dragging.zone.x);
        rect.setAttribute('y', dragging.zone.y);
        [...group.querySelectorAll('text')].forEach((text, index) => {
          text.setAttribute('x', dragging.zone.x + 14);
          text.setAttribute('y', dragging.zone.y + (index === 0 ? 26 : 45));
        });
      });
      group.addEventListener('pointerup', async () => {
        if (!dragging) return;
        const zone = dragging.zone;
        dragging = null;
        try {
          await api.put(`/api/zones/${zone.id}`, { x: zone.x, y: zone.y });
        } catch (error) { toast(error.message, 'error'); }
      });
    });
  }
}
