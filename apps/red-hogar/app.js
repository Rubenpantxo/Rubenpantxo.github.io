/* ============================================================
   Red Hogar — lógica de la app
   Datos: localStorage (clave red-hogar-v1). Sin dependencias.
   ============================================================ */
'use strict';

const LS_KEY = 'red-hogar-v1';
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

/* ---------- Tipos de aparato e iconos SVG a medida ---------- */
const TYPES = {
  internet: 'Internet',
  router:   'Router',
  switch:   'Switch',
  pc:       'PC sobremesa',
  laptop:   'Portátil',
  tv:       'Televisión',
  movil:    'Móvil / tablet',
  fijo:     'Teléfono fijo',
  printer:  'Impresora',
  camera:   'Cámara',
  rele:     'Relé / enchufe',
  inversor: 'Inversor solar',
  otro:     'Otro aparato',
};

const ICONS = {
  internet: `<svg width="46" height="32" viewBox="0 0 46 32"><path d="M10 26a7 7 0 0 1-1-13.9A10.5 10.5 0 0 1 29.5 9a8.5 8.5 0 0 1 7 14.5" fill="url(#bodyc)" stroke="#5a4a3e" stroke-width="1.4"/><path d="M10 26h27" stroke="#5a4a3e" stroke-width="1.4"/><circle cx="23" cy="19" r="6.2" fill="none" stroke="#7c3547" stroke-width="1.2"/><ellipse cx="23" cy="19" rx="2.6" ry="6.2" fill="none" stroke="#7c3547" stroke-width="1"/><path d="M16.8 19h12.4M17.9 15.8h10.2M17.9 22.2h10.2" stroke="#7c3547" stroke-width="1"/></svg>`,
  router: `<svg width="52" height="38" viewBox="0 0 52 38"><line x1="12" y1="16" x2="7" y2="3" stroke="#5a4a3e" stroke-width="1.8"/><circle cx="7" cy="3" r="2" fill="#7c3547"/><line x1="40" y1="16" x2="45" y2="3" stroke="#5a4a3e" stroke-width="1.8"/><circle cx="45" cy="3" r="2" fill="#7c3547"/><rect x="4" y="16" width="44" height="14" rx="4" fill="url(#bodyc)" stroke="#5a4a3e" stroke-width="1.4"/><rect x="5" y="24" width="42" height="5" rx="2.5" fill="#e2d7bd"/><circle cx="11" cy="22" r="1.5" fill="#4f7d4f"/><circle cx="16.5" cy="22" r="1.5" fill="#4f7d4f"/><circle cx="22" cy="22" r="1.5" fill="#c9a13f"/><rect x="30" y="20" width="5" height="4" rx="1" fill="#5a4a3e"/><rect x="38" y="20" width="5" height="4" rx="1" fill="#5a4a3e"/></svg>`,
  switch: `<svg width="48" height="26" viewBox="0 0 48 26"><rect x="2" y="7" width="44" height="13" rx="3" fill="url(#bodyc)" stroke="#5a4a3e" stroke-width="1.4"/><rect x="7" y="12" width="5.5" height="5" rx="1" fill="#3e332b"/><rect x="15" y="12" width="5.5" height="5" rx="1" fill="#3e332b"/><rect x="23" y="12" width="5.5" height="5" rx="1" fill="#3e332b"/><rect x="31" y="12" width="5.5" height="5" rx="1" fill="#3e332b"/><rect x="39" y="12" width="5.5" height="5" rx="1" fill="#3e332b"/><circle cx="9.8" cy="10" r="1" fill="#4f7d4f"/><circle cx="17.8" cy="10" r="1" fill="#4f7d4f"/><circle cx="25.8" cy="10" r="1" fill="#c9a13f"/></svg>`,
  pc: `<svg width="52" height="38" viewBox="0 0 52 38"><rect x="2" y="3" width="30" height="21" rx="2" fill="url(#dark)"/><rect x="4.5" y="5.5" width="25" height="16" rx="1" fill="url(#scr)"/><path d="M4.5 5.5 18 21.5h-8z" fill="#fff" opacity=".12"/><rect x="14" y="24" width="6" height="5" fill="#5a4a3e"/><rect x="10" y="29" width="14" height="2.5" rx="1.2" fill="#5a4a3e"/><rect x="37" y="3" width="12" height="30" rx="2" fill="url(#bodyc)" stroke="#5a4a3e" stroke-width="1.3"/><line x1="40" y1="8" x2="46" y2="8" stroke="#5a4a3e" stroke-width="1"/><line x1="40" y1="11" x2="46" y2="11" stroke="#5a4a3e" stroke-width="1"/><line x1="40" y1="14" x2="46" y2="14" stroke="#5a4a3e" stroke-width="1"/><circle cx="43" cy="27" r="2" fill="none" stroke="#7c3547" stroke-width="1.2"/><line x1="43" y1="25" x2="43" y2="27" stroke="#7c3547" stroke-width="1.2"/></svg>`,
  laptop: `<svg width="48" height="32" viewBox="0 0 48 32"><rect x="9" y="2" width="30" height="20" rx="2" fill="url(#dark)"/><rect x="11.5" y="4.5" width="25" height="15" rx="1" fill="url(#scr)"/><path d="M11.5 4.5 25 19.5h-8z" fill="#fff" opacity=".12"/><path d="M4 26l5-4h30l5 4z" fill="url(#bodyc)" stroke="#5a4a3e" stroke-width="1.2"/><path d="M4 26h40v2.5a1.5 1.5 0 0 1-1.5 1.5h-37A1.5 1.5 0 0 1 4 28.5z" fill="#e2d7bd" stroke="#5a4a3e" stroke-width="1.2"/><rect x="20" y="23" width="8" height="1.8" rx=".9" fill="#5a4a3e" opacity=".55"/></svg>`,
  tv: `<svg width="48" height="36" viewBox="0 0 48 36"><rect x="2" y="2" width="44" height="26" rx="2.5" fill="url(#dark)" stroke="#3e332b" stroke-width="1.2"/><rect x="4.5" y="4.5" width="39" height="21" rx="1" fill="url(#scr)"/><path d="M4.5 4.5 24 25.5h-12z" fill="#fff" opacity=".12"/><circle cx="24" cy="27" r=".8" fill="#4f7d4f"/><path d="M17 31h14l3 3H14z" fill="#5a4a3e"/></svg>`,
  movil: `<svg width="22" height="38" viewBox="0 0 22 38"><rect x="2" y="2" width="18" height="34" rx="4" fill="url(#dark)"/><rect x="4" y="6" width="14" height="24" rx="1" fill="url(#scr)"/><path d="M4 6 14 30h-6z" fill="#fff" opacity=".12"/><circle cx="11" cy="33" r="1.6" fill="#e8dfc9"/><rect x="8" y="3.2" width="6" height="1.4" rx=".7" fill="#8a7a6a"/></svg>`,
  fijo: `<svg width="42" height="36" viewBox="0 0 42 36"><path d="M6 10c0-3 3.5-5 15-5s15 2 15 5-2 4-4 3.4c-2.5-.8-3-2.4-11-2.4s-8.5 1.6-11 2.4C8 14 6 13 6 10z" fill="url(#bodyc)" stroke="#5a4a3e" stroke-width="1.3"/><path d="M8 17h26l3 14H5z" fill="url(#bodyc)" stroke="#5a4a3e" stroke-width="1.3"/><rect x="15" y="20" width="12" height="8" rx="1" fill="#fff" stroke="#5a4a3e" stroke-width=".8"/><circle cx="18" cy="22.5" r=".9" fill="#7c3547"/><circle cx="21" cy="22.5" r=".9" fill="#7c3547"/><circle cx="24" cy="22.5" r=".9" fill="#7c3547"/><circle cx="18" cy="25.5" r=".9" fill="#7c3547"/><circle cx="21" cy="25.5" r=".9" fill="#7c3547"/><circle cx="24" cy="25.5" r=".9" fill="#7c3547"/></svg>`,
  printer: `<svg width="46" height="34" viewBox="0 0 46 34"><rect x="12" y="2" width="22" height="9" rx="1" fill="#fff" stroke="#5a4a3e" stroke-width="1.1"/><line x1="15" y1="5" x2="31" y2="5" stroke="#a5947e" stroke-width="1"/><line x1="15" y1="7.5" x2="27" y2="7.5" stroke="#a5947e" stroke-width="1"/><rect x="4" y="10" width="38" height="14" rx="3" fill="url(#bodyc)" stroke="#5a4a3e" stroke-width="1.3"/><circle cx="36" cy="14" r="1.3" fill="#4f7d4f"/><rect x="8" y="13" width="7" height="2.5" rx="1.2" fill="#7c3547" opacity=".7"/><path d="M9 24h28v6a1.5 1.5 0 0 1-1.5 1.5h-25A1.5 1.5 0 0 1 9 30z" fill="#e2d7bd" stroke="#5a4a3e" stroke-width="1.2"/><rect x="15" y="24" width="16" height="5" fill="#fff" stroke="#5a4a3e" stroke-width=".8"/></svg>`,
  camera: `<svg width="44" height="34" viewBox="0 0 44 34"><rect x="19" y="26" width="6" height="5" fill="#5a4a3e"/><rect x="13" y="30" width="18" height="2.5" rx="1.2" fill="#5a4a3e"/><rect x="2" y="6" width="30" height="17" rx="5" fill="url(#bodyc)" stroke="#5a4a3e" stroke-width="1.4"/><circle cx="14" cy="14.5" r="6" fill="url(#dark)"/><circle cx="14" cy="14.5" r="3.2" fill="url(#scr)"/><circle cx="12.5" cy="13" r="1" fill="#fff" opacity=".7"/><circle cx="26" cy="10.5" r="1.2" fill="#7c3547"/><path d="M32 11l9-4v13l-9-4z" fill="url(#bodyc)" stroke="#5a4a3e" stroke-width="1.3"/></svg>`,
  rele: `<svg width="36" height="36" viewBox="0 0 36 36"><rect x="4" y="4" width="28" height="28" rx="7" fill="url(#bodyc)" stroke="#5a4a3e" stroke-width="1.4"/><circle cx="11" cy="28" r="2.2" fill="none" stroke="#5a4a3e" stroke-width="1"/><line x1="9.7" y1="26.7" x2="12.3" y2="29.3" stroke="#5a4a3e" stroke-width="1"/><circle cx="25" cy="28" r="2.2" fill="none" stroke="#5a4a3e" stroke-width="1"/><line x1="23.7" y1="26.7" x2="26.3" y2="29.3" stroke="#5a4a3e" stroke-width="1"/><path d="M18 9v6" stroke="#7c3547" stroke-width="1.6" stroke-linecap="round"/><path d="M14 11.5a6 6 0 1 0 8 0" fill="none" stroke="#7c3547" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  inversor: `<svg width="42" height="40" viewBox="0 0 42 40"><rect x="5" y="3" width="32" height="30" rx="4" fill="url(#bodyc)" stroke="#5a4a3e" stroke-width="1.4"/><circle cx="14" cy="12" r="3.4" fill="none" stroke="#c9a13f" stroke-width="1.4"/><path d="M14 6.5v1.8M14 15.7v1.8M8.5 12h1.8M17.7 12h1.8M10.2 8.2l1.2 1.2M16.6 14.6l1.2 1.2M17.8 8.2l-1.2 1.2M11.4 14.6l-1.2 1.2" stroke="#c9a13f" stroke-width="1.1" stroke-linecap="round"/><rect x="22" y="8" width="11" height="8" rx="1.5" fill="url(#dark)"/><path d="M24 12.5c1.2-2.2 2.4 2.2 3.6 0s2.4 2.2 3.4 0" fill="none" stroke="#7ee08a" stroke-width="1.1"/><line x1="9" y1="22" x2="33" y2="22" stroke="#5a4a3e" stroke-width="1"/><line x1="9" y1="25.5" x2="33" y2="25.5" stroke="#5a4a3e" stroke-width="1"/><line x1="9" y1="29" x2="33" y2="29" stroke="#5a4a3e" stroke-width="1"/><path d="M21 33v5" stroke="#5a4a3e" stroke-width="1.6"/></svg>`,
  otro: `<svg width="38" height="32" viewBox="0 0 38 32"><rect x="4" y="6" width="30" height="20" rx="4" fill="url(#bodyc)" stroke="#5a4a3e" stroke-width="1.4"/><circle cx="13" cy="16" r="3" fill="none" stroke="#7c3547" stroke-width="1.3"/><line x1="20" y1="12" x2="29" y2="12" stroke="#5a4a3e" stroke-width="1.2"/><line x1="20" y1="16" x2="29" y2="16" stroke="#5a4a3e" stroke-width="1.2"/><line x1="20" y1="20" x2="26" y2="20" stroke="#5a4a3e" stroke-width="1.2"/></svg>`,
};
const iconOf = t => ICONS[t] || ICONS.otro;

const WIFI_WAVES = `<svg width="14" height="12" viewBox="0 0 16 13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M2 5.5a8.5 8.5 0 0 1 12 0"/><path d="M4.6 8.3a5 5 0 0 1 6.8 0"/><circle cx="8" cy="11" r="1.1" fill="currentColor" stroke="none"/></svg>`;
const PORT_ICON = `<svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1" y="1" width="12" height="8" rx="1.5"/><line x1="4" y1="9" x2="4" y2="6"/><line x1="7" y1="9" x2="7" y2="6"/><line x1="10" y1="9" x2="10" y2="6"/></svg>`;

const CONN_KINDS = ['USB', 'HDMI', 'Bluetooth', 'WiFi', 'Jack', 'Otro'];

/* ---------- Datos de ejemplo: tu esquema del papel ---------- */
function seedData() {
  return {
    version: 1,
    networks: [
      { id: 'net-mov24', ssid: 'MOVISTAR_6688',  band: '2,4 GHz', routerId: 'd-router1', color: 'a',   subnet: '192.168.1.x' },
      { id: 'net-mov5',  ssid: 'MOVISTAR-6688',  band: '5 GHz',   routerId: 'd-router1', color: 'b',   subnet: '192.168.1.x' },
      { id: 'net-ay',    ssid: 'Ay_A50ns_O',     band: '',        routerId: 'd-router2', color: 'c',   subnet: '192.168.2.x' },
      { id: 'net-ayiot', ssid: 'Ay_A50ns_O-IoT', band: 'IoT',     routerId: 'd-router2', color: 'iot', subnet: '192.168.2.x' },
    ],
    devices: [
      { id: 'd-internet', name: 'Internet', type: 'internet', model: 'Fibra Movistar', ip: '', mac: '', status: 'on', wifi: null, x: 500, y: 16, note: '', datasheet: null, peripherals: [] },
      { id: 'd-router1', name: 'Router Movistar', type: 'router', model: 'HGU fibra (modelo pendiente ✏️)', ip: '192.168.1.1', mac: '', status: 'on', wifi: null, x: 147, y: 138, note: 'Contraseña del panel en la pegatina de abajo.', datasheet: null, peripherals: [] },
      { id: 'd-router2', name: 'Router 2 (AP)', type: 'router', model: 'Punto de acceso (modelo pendiente ✏️)', ip: '192.168.1.2', mac: '', status: 'on', wifi: null, x: 787, y: 138, note: '', datasheet: null, peripherals: [] },
      { id: 'd-switch', name: 'Switch', type: 'switch', model: '5 puertos', ip: '', mac: '', status: 'on', wifi: null, x: 503, y: 240, note: '', datasheet: null, peripherals: [] },
      { id: 'd-tvsalon', name: 'TV salón', type: 'tv', model: 'modelo pendiente ✏️', ip: '192.168.1.20', mac: '', status: 'on', wifi: null, x: 59, y: 358, note: '', datasheet: null, peripherals: [] },
      { id: 'd-fijo', name: 'Teléfono fijo', type: 'fijo', model: '', ip: '', mac: '', status: 'on', wifi: null, x: 59, y: 506, note: '', datasheet: null, peripherals: [] },
      { id: 'd-portatil', name: 'Portátil', type: 'laptop', model: 'modelo pendiente ✏️', ip: '192.168.1.35', mac: '', status: 'on', wifi: 'net-mov24', x: 234, y: 497, note: '', datasheet: null, peripherals: [] },
      { id: 'd-pc1', name: 'PC principal', type: 'pc', model: 'Torre sobremesa ✏️', ip: '192.168.1.34', mac: '', status: 'on', wifi: null, x: 472, y: 382, note: '', datasheet: null,
        peripherals: [
          { id: 'p-mon', name: 'Monitor', model: 'modelo pendiente ✏️', conn: 'HDMI', datasheet: null, note: '' },
          { id: 'p-tec', name: 'Teclado', model: '', conn: 'USB', datasheet: null, note: '' },
          { id: 'p-rat', name: 'Ratón', model: '', conn: 'Bluetooth', datasheet: null, note: '' },
        ] },
      { id: 'd-impresora', name: 'Impresora', type: 'printer', model: 'modelo pendiente ✏️', ip: '192.168.1.40', mac: '', status: 'off', wifi: 'net-mov24', x: 404, y: 537, note: '', datasheet: null, peripherals: [] },
      { id: 'd-pc2', name: 'PC sobremesa 2', type: 'pc', model: '', ip: '', mac: '', status: 'off', wifi: null, x: 589, y: 525, note: 'Ejemplo de aparato sin conexión: tiende un cable hasta él o asígnale una red WiFi desde su ficha.', datasheet: null, peripherals: [] },
      { id: 'd-tvdorm', name: 'TV dormitorio', type: 'tv', model: 'modelo pendiente ✏️', ip: '192.168.2.21', mac: '', status: 'on', wifi: 'net-ay', x: 700, y: 368, note: '', datasheet: null, peripherals: [] },
      { id: 'd-shelly', name: 'Shelly 1PM', type: 'rele', model: 'Shelly 1PM Mini Gen3', ip: '192.168.2.60', mac: '', status: 'on', wifi: 'net-ayiot', x: 839, y: 328, note: 'Alimenta la cámara. In: 83-3487.', datasheet: { kind: 'pdf', href: 'datasheets/shelly-1pm-mini-gen3.pdf' }, peripherals: [] },
      { id: 'd-camara', name: 'Cámara', type: 'camera', model: 'modelo pendiente ✏️', ip: '192.168.2.61', mac: '', status: 'on', wifi: 'net-ayiot', x: 946, y: 328, note: '', datasheet: null, peripherals: [] },
      { id: 'd-inversor', name: 'Inversor SUN2000', type: 'inversor', model: 'Huawei SUN2000 (2-6KTL-L1)', ip: '192.168.2.50', mac: '', status: 'on', wifi: 'net-ay', x: 904, y: 498, note: '', datasheet: { kind: 'pdf', href: 'datasheets/huawei-sun2000-l1.pdf' }, peripherals: [] },
      { id: 'd-movil', name: 'Móvil', type: 'movil', model: '', ip: '192.168.1.51', mac: '', status: 'on', wifi: 'net-mov5', x: 660, y: 30, note: '', datasheet: null, peripherals: [] },
    ],
    links: [
      { id: 'l1', a: 'd-internet', b: 'd-router1', kind: 'cable', label: '' },
      { id: 'l2', a: 'd-router1', b: 'd-switch', kind: 'cable', label: '' },
      { id: 'l3', a: 'd-switch', b: 'd-router2', kind: 'cable', label: '' },
      { id: 'l4', a: 'd-switch', b: 'd-pc1', kind: 'cable', label: '' },
      { id: 'l5', a: 'd-router1', b: 'd-tvsalon', kind: 'cable', label: '' },
      { id: 'l6', a: 'd-router1', b: 'd-fijo', kind: 'otro', label: 'RJ11' },
      { id: 'l7', a: 'd-shelly', b: 'd-camara', kind: 'otro', label: 'alimentación' },
    ],
  };
}

/* ---------- Estado ---------- */
let state = load();
let currentView = 'general';
let selectedNet = null;
let query = '';
const nodeEls = new Map();   // deviceId -> elemento .node

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.devices) && Array.isArray(data.networks)) return data;
    }
  } catch (e) { console.warn('No se pudo leer localStorage:', e); }
  return seedData();
}
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
  catch (e) { toast('⚠ No se pudo guardar en este navegador', 'warn'); }
}

const dev = id => state.devices.find(d => d.id === id);
const net = id => state.networks.find(n => n.id === id);
const linksOf = id => state.links.filter(l => l.a === id || l.b === id);
const cableLinksOf = id => linksOf(id).filter(l => l.kind === 'cable');
const netsOfRouter = rid => state.networks.filter(n => n.routerId === rid);
const netColorVar = n => `var(--net-${n ? n.color : 'a'})`;

function isConnected(d) {
  return d.type === 'internet' || !!d.wifi || linksOf(d.id).length > 0;
}
function connDescr(d) {
  const parts = [];
  for (const l of cableLinksOf(d.id)) {
    const other = dev(l.a === d.id ? l.b : l.a);
    if (other) parts.push(`cable con ${other.name}`);
  }
  for (const l of linksOf(d.id).filter(x => x.kind === 'otro')) {
    const other = dev(l.a === d.id ? l.b : l.a);
    if (other) parts.push(`${l.label || 'enlace'} con ${other.name}`);
  }
  if (d.wifi) { const n = net(d.wifi); if (n) parts.push(`WiFi ${n.ssid}`); }
  if (d.type === 'internet') parts.push('llega de la calle');
  return parts.length ? parts.join(' · ') : 'sin conexión';
}

/* ---------- Toasts y menú emergente ---------- */
function toast(msg, cls = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + cls;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

const menuEl = $('#cablemenu');
function showMenu(x, y, items) {
  menuEl.innerHTML = items.map((it, i) =>
    it.header ? `<div class="lbl">${esc(it.header)}</div>`
              : `<button data-i="${i}">${it.icon || ''} ${esc(it.label)}</button>`).join('');
  menuEl.classList.add('on');
  const mw = 200, mh = items.length * 38 + 10;
  menuEl.style.left = Math.min(x, innerWidth - mw - 8) + 'px';
  menuEl.style.top = Math.min(y, innerHeight - mh - 8) + 'px';
  $$('button', menuEl).forEach(b => b.onclick = () => { hideMenu(); items[+b.dataset.i].action?.(); });
}
function hideMenu() { menuEl.classList.remove('on'); }
document.addEventListener('pointerdown', e => { if (!menuEl.contains(e.target)) hideMenu(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { hideMenu(); $$('.overlay.on').forEach(o => o.classList.remove('on')); }
});

/* ---------- Pestañas ---------- */
$$('.tab').forEach(t => t.addEventListener('click', () => {
  if (t.disabled) return;
  currentView = t.dataset.view;
  $$('.tab').forEach(x => x.setAttribute('aria-selected', x === t ? 'true' : 'false'));
  $$('.view').forEach(v => v.classList.toggle('on', v.id === 'view-' + currentView));
  renderAll();
}));
function gotoView(name) { $$('.tab').find(t => t.dataset.view === name)?.click(); }

/* ============================================================
   VISTA GENERAL — mapa
   ============================================================ */
const mapEl = $('#map');
const wiresEl = $('#wires');
const nodesEl = $('#nodes');

function centerOf(id) {
  const el = nodeEls.get(id);
  const d = dev(id);
  if (!el || !d) return { x: 0, y: 0 };
  return { x: d.x + el.offsetWidth / 2, y: d.y + el.offsetHeight / 2 };
}

function cablePath(p1, p2) {
  const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy) || 1;
  let nx = -dy / dist, ny = dx / dist;
  if (ny < 0) { nx = -nx; ny = -ny; }       // el cable siempre «cuelga» hacia abajo
  const s = Math.min(42, dist * 0.16);
  return `M ${p1.x} ${p1.y} Q ${mx + nx * s} ${my + ny * s} ${p2.x} ${p2.y}`;
}

function renderMap() {
  nodesEl.innerHTML = '';
  nodeEls.clear();

  for (const d of state.devices) {
    const el = document.createElement('div');
    el.className = 'node' + (d.type === 'router' ? ' hub' : '') + (isConnected(d) ? '' : ' out');
    el.style.left = d.x + 'px';
    el.style.top = d.y + 'px';
    el.dataset.id = d.id;

    let inner = `<span class="st${d.status === 'on' ? '' : ' off'}"></span>
      <div class="ic">${iconOf(d.type)}</div>
      <div class="nm">${esc(d.name)}</div>
      <div class="ipl">${esc(d.ip || (d.type === 'internet' ? esc(d.model) : isConnected(d) ? 'sin IP' : 'sin conexión'))}</div>`;

    if (d.type === 'router') {
      for (const n of netsOfRouter(d.id)) {
        const count = state.devices.filter(x => x.wifi === n.id).length;
        inner += `<button class="ssid ${n.color}${selectedNet === n.id ? ' on' : ''}" data-net="${n.id}" title="Ver aparatos de ${esc(n.ssid)}">📶 ${esc(n.ssid)} <span class="n">${count}</span></button>`;
      }
    }
    if (d.wifi) {
      const n = net(d.wifi);
      if (n) inner += `<button class="wifi-badge ${n.color}" data-net="${n.id}" title="WiFi ${esc(n.ssid)}">${WIFI_WAVES}</button>`;
    }
    if (d.peripherals?.length) inner += `<span class="badge">+${d.peripherals.length} perif.</span>`;
    inner += `<div class="port" title="Arrastra hasta otro aparato para tender un cable">${PORT_ICON}</div>`;

    el.innerHTML = inner;
    nodesEl.appendChild(el);
    nodeEls.set(d.id, el);
  }
  updateWires();
  applyNetSelection();
  applySearchGeneral();
  renderMobileNets();
  renderNetpanel();
}

function updateWires() {
  let svg = '';
  // halos de cobertura de los routers
  for (const d of state.devices.filter(x => x.type === 'router')) {
    const c = centerOf(d.id);
    const nets = netsOfRouter(d.id);
    nets.forEach((n, i) => {
      svg += `<circle class="ring ${n.color}" cx="${c.x}" cy="${c.y}" r="${58 + i * 32}" stroke-dasharray="2 6" opacity="${i ? .3 : .4}"/>`;
    });
  }
  // cables y otros enlaces
  for (const l of state.links) {
    const p1 = centerOf(l.a), p2 = centerOf(l.b);
    const d = cablePath(p1, p2);
    if (l.kind === 'otro') {
      svg += `<path class="cable otro" d="${d}"/>`;
      if (l.label) {
        const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2 + 16;
        svg += `<text class="cable-label" x="${mx}" y="${my}" text-anchor="middle">${esc(l.label)}</text>`;
      }
    } else {
      svg += `<path class="cable" d="${d}"/>`;
    }
    svg += `<path class="cable-hit" d="${d}" data-link="${l.id}"/>`;
  }
  svg += `<path class="templink" id="templink" d="" style="display:none"/>`;
  wiresEl.innerHTML = svg;

  $$('.cable-hit', wiresEl).forEach(p => {
    p.addEventListener('click', e => {
      e.stopPropagation();
      const l = state.links.find(x => x.id === p.dataset.link);
      if (!l) return;
      const a = dev(l.a), b = dev(l.b);
      showMenu(e.clientX, e.clientY, [
        { header: `${a?.name ?? '?'} ⇄ ${b?.name ?? '?'}${l.label ? ' · ' + l.label : ''}` },
        { icon: '🔌', label: 'Desenchufar', action: () => {
            state.links = state.links.filter(x => x.id !== l.id);
            save(); renderMap();
            toast(`Cable desenchufado: ${a?.name} ⇄ ${b?.name}`);
          } },
        { icon: '✕', label: 'Cancelar', action: () => {} },
      ]);
    });
  });
}

/* --- selección de red (chips / ondas) --- */
function selectNet(id) {
  selectedNet = (selectedNet === id) ? null : id;
  renderMap();
}
function applyNetSelection() {
  mapEl.classList.toggle('netsel', !!selectedNet);
  if (!selectedNet) return;
  const n = net(selectedNet);
  for (const [id, el] of nodeEls) {
    const d = dev(id);
    const lit = d.wifi === selectedNet || (n && n.routerId === id);
    el.classList.toggle('lit', lit);
    if (lit && n) el.style.setProperty('--sel', netColorVar(n));
  }
}
function renderNetpanel() {
  const panel = $('#netpanel');
  if (!selectedNet) { panel.classList.remove('on'); return; }
  const n = net(selectedNet);
  if (!n) { panel.classList.remove('on'); return; }
  const list = state.devices.filter(d => d.wifi === n.id);
  panel.innerHTML = `
    <header style="--c:${netColorVar(n)}">📶 ${esc(n.ssid)}${n.band ? ' · ' + esc(n.band) : ''}
      <button class="x" title="Cerrar">✕</button></header>
    ${list.length ? list.map(d => `
      <div class="row" data-id="${d.id}">
        <span class="dot" style="width:7px;height:7px;border-radius:50%;background:${d.status === 'on' ? 'var(--green)' : 'var(--faint)'}"></span>
        ${esc(d.name)}<span class="ipm">${esc(d.ip || '—')}</span>
      </div>`).join('')
      : `<div class="empty">Sin aparatos en esta red todavía. Asigna la red desde la ficha de un aparato.</div>`}`;
  panel.classList.add('on');
  $('.x', panel).onclick = () => { selectedNet = null; renderMap(); };
  $$('.row', panel).forEach(r => r.onclick = () => openDevice(r.dataset.id));
}

/* --- búsqueda --- */
function applySearchGeneral() {
  const q = query.trim().toLowerCase();
  mapEl.classList.toggle('filtering', !!q);
  if (!q) return;
  for (const [id, el] of nodeEls) {
    const d = dev(id);
    const hay = `${d.name} ${d.ip} ${d.mac} ${d.model} ${TYPES[d.type] || ''}`.toLowerCase();
    el.classList.toggle('hit', hay.includes(q));
  }
}
$('#search').addEventListener('input', e => { query = e.target.value; renderAll(); });

/* --- interacción con el mapa: arrastrar nodos y tender cables --- */
let drag = null;   // {kind:'node'|'link', id, startX, startY, origX, origY, moved}

nodesEl.addEventListener('pointerdown', e => {
  const nodeEl = e.target.closest('.node');
  if (!nodeEl) return;
  const id = nodeEl.dataset.id;
  if (e.target.closest('.ssid') || e.target.closest('.wifi-badge')) return; // clics propios
  if (e.target.closest('.port')) {
    drag = { kind: 'link', id, moved: false };
    mapEl.classList.add('linking');
    e.preventDefault();
    return;
  }
  const d = dev(id);
  drag = { kind: 'node', id, startX: e.clientX, startY: e.clientY, origX: d.x, origY: d.y, moved: false };
  nodeEl.classList.add('dragging');
  e.preventDefault();
});

document.addEventListener('pointermove', e => {
  if (!drag) return;
  if (drag.kind === 'node') {
    const d = dev(drag.id);
    const el = nodeEls.get(drag.id);
    const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    d.x = Math.max(4, Math.min(mapEl.offsetWidth - el.offsetWidth - 4, drag.origX + dx));
    d.y = Math.max(4, Math.min(mapEl.offsetHeight - el.offsetHeight - 4, drag.origY + dy));
    el.style.left = d.x + 'px';
    el.style.top = d.y + 'px';
    updateWires();
  } else if (drag.kind === 'link') {
    drag.moved = true;
    const rect = mapEl.getBoundingClientRect();
    const p1 = centerOf(drag.id);
    const p2 = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const t = $('#templink');
    if (t) { t.style.display = ''; t.setAttribute('d', cablePath(p1, p2)); }
    // resaltar posible destino
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('.node');
    $$('.node.link-target').forEach(n => n.classList.remove('link-target'));
    if (under && under.dataset.id !== drag.id) under.classList.add('link-target');
  }
});

document.addEventListener('pointerup', e => {
  if (!drag) return;
  const cur = drag; drag = null;
  mapEl.classList.remove('linking');
  $$('.node.link-target').forEach(n => n.classList.remove('link-target'));
  const t = $('#templink'); if (t) t.style.display = 'none';

  if (cur.kind === 'node') {
    nodeEls.get(cur.id)?.classList.remove('dragging');
    if (cur.moved) { save(); }
    else openDevice(cur.id);                 // clic sin arrastre = abrir ficha
  } else if (cur.kind === 'link') {
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('.node');
    if (under && under.dataset.id !== cur.id) {
      const a = cur.id, b = under.dataset.id;
      const dup = state.links.some(l => (l.a === a && l.b === b) || (l.a === b && l.b === a));
      if (dup) { toast('Ese cable ya existe', 'warn'); return; }
      state.links.push({ id: uid(), a, b, kind: 'cable', label: '' });
      save(); renderMap();
      toast(`Cable tendido: ${dev(a)?.name} ⇄ ${dev(b)?.name}`);
    }
  }
});

nodesEl.addEventListener('click', e => {
  const chip = e.target.closest('.ssid, .wifi-badge');
  if (chip) { e.stopPropagation(); selectNet(chip.dataset.net); }
});

/* --- acordeón móvil --- */
function renderMobileNets() {
  const box = $('#mobile-nets');
  const q = query.trim().toLowerCase();
  const match = d => !q || `${d.name} ${d.ip} ${d.model}`.toLowerCase().includes(q);
  const row = d => `
    <div class="row" data-id="${d.id}">
      <span style="width:7px;height:7px;border-radius:50%;flex:none;background:${d.status === 'on' ? 'var(--green)' : 'var(--faint)'}"></span>
      ${esc(d.name)}<span class="ipm">${esc(d.ip || '—')}</span>
    </div>`;
  let html = '';
  for (const n of state.networks) {
    const list = state.devices.filter(d => d.wifi === n.id && match(d));
    html += `<details class="mnet ${n.color}">
      <summary>📶 ${esc(n.ssid)}${n.band ? ' · ' + esc(n.band) : ''}<span class="n">${list.length}</span></summary>
      ${list.map(row).join('') || '<div class="row" style="color:var(--faint)">vacía</div>'}</details>`;
  }
  const wired = state.devices.filter(d => !d.wifi && d.type !== 'internet' && cableLinksOf(d.id).length && match(d));
  if (wired.length) {
    html += `<details class="mnet" style="--c:var(--wine)">
      <summary>🔗 Cableados<span class="n">${wired.length}</span></summary>${wired.map(row).join('')}</details>`;
  }
  box.innerHTML = html;
  $$('.row[data-id]', box).forEach(r => r.onclick = () => openDevice(r.dataset.id));
}

/* ============================================================
   FICHA DE DISPOSITIVO
   ============================================================ */
function openOverlay(id) { $('#' + id).classList.add('on'); }
function closeOverlay(id) { $('#' + id).classList.remove('on'); }
$$('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.remove('on'); }));
document.addEventListener('click', e => {
  const c = e.target.closest('[data-close]');
  if (c) closeOverlay(c.dataset.close);
});

function openDevice(id) {
  const d = dev(id);
  if (!d) return;
  const n = d.wifi ? net(d.wifi) : null;
  const cables = cableLinksOf(id);
  const box = $('#device-modal');

  const netOptions = ['<option value="">— sin WiFi —</option>']
    .concat(state.networks.map(x => `<option value="${x.id}" ${d.wifi === x.id ? 'selected' : ''}>${esc(x.ssid)}</option>`)).join('');

  box.innerHTML = `
    <div class="m-head">
      <div class="m-ic">${iconOf(d.type)}</div>
      <div>
        <h3>${esc(d.name)}</h3>
        <div class="m-sub">${esc(TYPES[d.type] || 'Aparato')} · ${esc(connDescr(d))}</div>
      </div>
      <button class="m-x" data-close="ov-device">✕</button>
    </div>
    <div class="m-body">
      <div class="facts">
        <div class="fact"><div class="k">Modelo</div><div class="v">${esc(d.model || '—')}</div></div>
        <div class="fact"><div class="k">Estado</div><div class="v">
          <button class="chip" id="f-status" style="--c:${d.status === 'on' ? 'var(--green)' : 'var(--faint)'}">${d.status === 'on' ? '● Encendido' : '○ Apagado'}</button>
        </div></div>
        <div class="fact"><div class="k">IP</div><div class="v mono">${esc(d.ip || '—')}</div></div>
        <div class="fact"><div class="k">MAC</div><div class="v mono">${esc(d.mac || '—')}</div></div>
        <div class="fact" style="grid-column:1/-1"><div class="k">Conexión</div><div class="v">
          ${cables.map(l => { const o = dev(l.a === id ? l.b : l.a); return `<span class="chip">🔗 Cable · ${esc(o?.name ?? '?')}</span>`; }).join(' ')}
          ${n ? `<span class="chip ${n.color}">📶 ${esc(n.ssid)}</span>` : ''}
          ${!cables.length && !n ? '<span class="chip" style="--c:var(--faint)">Sin conexión</span>' : ''}
          <label style="font-size:11px;color:var(--muted);display:inline-flex;gap:5px;align-items:center;margin-left:6px">
            red&nbsp;WiFi <select id="f-wifi">${netOptions}</select>
          </label>
        </div></div>
        <div class="m-row">
          ${d.datasheet ? `<button class="btn pinky" id="f-sheet">📄 Ver datasheet</button>` : ''}
          ${cables.length ? `<button class="btn ghost" id="f-unplug">🔌 Desenchufar</button>` : ''}
          <button class="btn ghost" id="f-addper">＋ Añadir periférico</button>
        </div>
        <div class="periph">
          <div class="p-h">Periféricos · ${d.peripherals?.length || 0}</div>
          ${d.peripherals?.length ? d.peripherals.map(p => `
            <div class="p-r" data-per="${p.id}">
              ${esc(p.name)}${p.model ? ` <span style="color:var(--faint);font-size:11px">· ${esc(p.model)}</span>` : ''}
              <button class="mini" data-per-edit="${p.id}">ficha</button>
              ${p.datasheet ? `<button class="mini" data-per-sheet="${p.id}">📄</button>` : ''}
              <span class="conn ${esc(p.conn)}">${esc(p.conn.toUpperCase())}</span>
              <button class="del" data-per-del="${p.id}" title="Quitar">🗑</button>
            </div>`).join('') : '<div class="empty">Sin periféricos. Añádelos con el botón de arriba (monitor, teclado, ratón…).</div>'}
        </div>
      </div>
      <div class="postit">
        <div class="ph">📌 Nota</div>
        <textarea id="f-note" placeholder="Anota ajustes, contraseñas del panel, puertos…">${esc(d.note || '')}</textarea>
      </div>
    </div>
    <div class="m-foot">
      <button class="btn ghost" id="f-edit">✏️ Editar</button>
      <button class="btn danger" id="f-del">🗑 Eliminar</button>
      <span class="sp"></span>
      <button class="btn" data-close="ov-device">Cerrar</button>
    </div>`;

  $('#f-status').onclick = () => { d.status = d.status === 'on' ? 'off' : 'on'; save(); renderMap(); openDevice(id); };
  $('#f-wifi').onchange = e => {
    d.wifi = e.target.value || null;
    save(); renderMap(); openDevice(id);
    toast(d.wifi ? `${d.name} → WiFi ${net(d.wifi).ssid}` : `${d.name}: WiFi quitado`);
  };
  $('#f-note').oninput = e => { d.note = e.target.value; save(); };
  $('#f-sheet')?.addEventListener('click', () => openSheet(d.datasheet, d.name));
  $('#f-unplug')?.addEventListener('click', () => {
    state.links = state.links.filter(l => !(l.kind === 'cable' && (l.a === id || l.b === id)));
    save(); renderMap(); openDevice(id);
    toast(`${d.name}: cables desenchufados`);
  });
  $('#f-addper').onclick = () => openPeripheralForm(id, null);
  $$('[data-per-edit]', box).forEach(b => b.onclick = () => openPeripheralForm(id, b.dataset.perEdit));
  $$('[data-per-sheet]', box).forEach(b => b.onclick = () => {
    const p = d.peripherals.find(x => x.id === b.dataset.perSheet);
    if (p?.datasheet) openSheet(p.datasheet, p.name);
  });
  $$('[data-per-del]', box).forEach(b => b.onclick = () => {
    const p = d.peripherals.find(x => x.id === b.dataset.perDel);
    if (p && confirm(`¿Quitar el periférico «${p.name}»?`)) {
      d.peripherals = d.peripherals.filter(x => x.id !== p.id);
      save(); renderMap(); openDevice(id);
    }
  });
  $('#f-edit').onclick = () => { closeOverlay('ov-device'); openForm(id); };
  $('#f-del').onclick = () => {
    if (!confirm(`¿Eliminar «${d.name}» y sus cables?`)) return;
    state.devices = state.devices.filter(x => x.id !== id);
    state.links = state.links.filter(l => l.a !== id && l.b !== id);
    for (const nn of state.networks) if (nn.routerId === id) nn.routerId = null;
    save(); closeOverlay('ov-device'); renderAll();
    toast(`«${d.name}» eliminado`);
  };

  openOverlay('ov-device');
}

/* ---------- visor de datasheets ---------- */
function openSheet(ds, title) {
  if (!ds) return;
  if (ds.kind === 'url') { window.open(ds.href, '_blank', 'noopener'); return; }
  $('#pdf-title').textContent = `Datasheet · ${title}`;
  $('#pdf-frame').src = ds.href;
  openOverlay('ov-pdf');
}

/* ============================================================
   FORMULARIO añadir / editar aparato
   ============================================================ */
function openForm(editId = null) {
  const d = editId ? dev(editId) : null;
  const box = $('#form-modal');
  const typeOptions = Object.entries(TYPES)
    .map(([k, v]) => `<option value="${k}" ${d?.type === k ? 'selected' : ''}>${v}</option>`).join('');
  const netOptions = ['<option value="">— sin WiFi —</option>']
    .concat(state.networks.map(x => `<option value="${x.id}" ${d?.wifi === x.id ? 'selected' : ''}>${esc(x.ssid)}</option>`)).join('');

  box.innerHTML = `
    <div class="m-head">
      <div class="m-ic" id="fm-icon">${iconOf(d?.type || 'otro')}</div>
      <h3 style="font-size:17px">${d ? 'Editar «' + esc(d.name) + '»' : 'Añadir aparato'}</h3>
      <button class="m-x" data-close="ov-form">✕</button>
    </div>
    <form id="fm" class="m-body single">
      <div class="form-grid">
        <div class="field"><label>Nombre *</label><input name="name" required value="${esc(d?.name || '')}" placeholder="TV cocina, NAS, tablet…"></div>
        <div class="field"><label>Tipo</label><select name="type">${typeOptions}</select></div>
        <div class="field"><label>Modelo</label><input name="model" value="${esc(d?.model || '')}" placeholder="marca y modelo exacto"></div>
        <div class="field"><label>Red WiFi</label><select name="wifi">${netOptions}</select></div>
        <div class="field"><label>IP</label><input name="ip" value="${esc(d?.ip || '')}" placeholder="192.168.1.x" inputmode="numeric"></div>
        <div class="field"><label>MAC</label><input name="mac" value="${esc(d?.mac || '')}" placeholder="AA:BB:CC:DD:EE:FF"></div>
        <div class="field full"><label>Datasheet (PDF del repo o enlace)</label>
          <input name="datasheet" value="${esc(d?.datasheet?.href || '')}" placeholder="datasheets/mi-aparato.pdf ó https://…">
        </div>
        <div class="field full"><label>Nota del post-it</label><textarea name="note" placeholder="ajustes, puertos, recordatorios…">${esc(d?.note || '')}</textarea></div>
        <div class="field full" style="display:flex;gap:8px;align-items:center">
          <input type="checkbox" id="fm-on" name="on" ${!d || d.status === 'on' ? 'checked' : ''} style="width:auto">
          <label for="fm-on" style="margin:0;text-transform:none;letter-spacing:0;font-family:inherit;font-size:13px;color:var(--ink)">Encendido</label>
        </div>
      </div>
    </form>
    <div class="m-foot">
      <span class="sp"></span>
      <button class="btn" data-close="ov-form">Cancelar</button>
      <button class="btn primary" id="fm-save">${d ? 'Guardar cambios' : 'Añadir al mapa'}</button>
    </div>`;

  $('select[name=type]', box).onchange = e => { $('#fm-icon').innerHTML = iconOf(e.target.value); };
  $('#fm-save').onclick = () => {
    const f = new FormData($('#fm'));
    const name = (f.get('name') || '').toString().trim();
    if (!name) { toast('Ponle un nombre al aparato', 'warn'); return; }
    const dsRaw = (f.get('datasheet') || '').toString().trim();
    const datasheet = dsRaw ? { kind: /^https?:/i.test(dsRaw) ? 'url' : 'pdf', href: dsRaw } : null;
    const base = d || {
      id: uid(), x: 480 + Math.round(Math.random() * 120), y: 300 + Math.round(Math.random() * 80),
      peripherals: [], status: 'on',
    };
    Object.assign(base, {
      name,
      type: f.get('type'),
      model: (f.get('model') || '').toString().trim(),
      ip: (f.get('ip') || '').toString().trim(),
      mac: (f.get('mac') || '').toString().trim(),
      wifi: f.get('wifi') || null,
      note: (f.get('note') || '').toString(),
      status: f.get('on') ? 'on' : 'off',
      datasheet,
    });
    if (!d) state.devices.push(base);
    save(); closeOverlay('ov-form'); renderAll();
    toast(d ? 'Cambios guardados' : `«${name}» añadido al mapa`);
    if (!d) flashDevice(base.id);
  };
  openOverlay('ov-form');
}

/* ---------- formulario de periférico ---------- */
function openPeripheralForm(deviceId, perId) {
  const d = dev(deviceId);
  const p = perId ? d.peripherals.find(x => x.id === perId) : null;
  const box = $('#form-modal');
  const connOptions = CONN_KINDS.map(c => `<option ${p?.conn === c ? 'selected' : ''}>${c}</option>`).join('');
  box.innerHTML = `
    <div class="m-head">
      <div class="m-ic">${iconOf('otro')}</div>
      <h3 style="font-size:17px">${p ? 'Periférico: ' + esc(p.name) : 'Nuevo periférico de ' + esc(d.name)}</h3>
      <button class="m-x" data-close="ov-form">✕</button>
    </div>
    <form id="fmp" class="m-body single">
      <div class="form-grid">
        <div class="field"><label>Nombre *</label><input name="name" required value="${esc(p?.name || '')}" placeholder="Monitor, teclado, webcam…"></div>
        <div class="field"><label>Conexión</label><select name="conn">${connOptions}</select></div>
        <div class="field full"><label>Modelo</label><input name="model" value="${esc(p?.model || '')}"></div>
        <div class="field full"><label>Datasheet (PDF del repo o enlace)</label><input name="datasheet" value="${esc(p?.datasheet?.href || '')}" placeholder="datasheets/monitor.pdf ó https://…"></div>
        <div class="field full"><label>Nota</label><textarea name="note">${esc(p?.note || '')}</textarea></div>
      </div>
    </form>
    <div class="m-foot">
      <span class="sp"></span>
      <button class="btn" data-close="ov-form">Cancelar</button>
      <button class="btn primary" id="fmp-save">${p ? 'Guardar' : 'Añadir'}</button>
    </div>`;
  $('#fmp-save').onclick = () => {
    const f = new FormData($('#fmp'));
    const name = (f.get('name') || '').toString().trim();
    if (!name) { toast('Ponle un nombre al periférico', 'warn'); return; }
    const dsRaw = (f.get('datasheet') || '').toString().trim();
    const target = p || { id: uid() };
    Object.assign(target, {
      name,
      conn: f.get('conn') || 'Otro',
      model: (f.get('model') || '').toString().trim(),
      note: (f.get('note') || '').toString(),
      datasheet: dsRaw ? { kind: /^https?:/i.test(dsRaw) ? 'url' : 'pdf', href: dsRaw } : null,
    });
    if (!p) (d.peripherals ||= []).push(target);
    save(); closeOverlay('ov-form'); renderMap(); openDevice(deviceId);
  };
  openOverlay('ov-form');
}

function flashDevice(id) {
  gotoView('general');
  requestAnimationFrame(() => {
    const el = nodeEls.get(id);
    if (!el) return;
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 3400);
  });
}

/* ============================================================
   VISTA LISTA IPs
   ============================================================ */
function renderIps() {
  const grid = $('#ips-grid');
  const q = query.trim().toLowerCase();
  const match = d => !q || `${d.name} ${d.ip} ${d.mac} ${d.model}`.toLowerCase().includes(q);

  // IPs duplicadas
  const counts = {};
  for (const d of state.devices) if (d.ip) counts[d.ip] = (counts[d.ip] || 0) + 1;
  const dups = Object.values(counts).filter(c => c > 1).length;
  const warn = $('#dup-warn');
  warn.hidden = !dups;
  if (dups) warn.textContent = `⚠ ${dups} IP${dups > 1 ? 's' : ''} duplicada${dups > 1 ? 's' : ''}`;

  const row = d => `
    <tr data-id="${d.id}" class="${d.ip && counts[d.ip] > 1 ? 'dup' : ''}">
      <td style="width:22px"><span class="dot${d.status === 'on' ? '' : ' off'}"></span></td>
      <td>${esc(d.name)}${d.ip && counts[d.ip] > 1 ? ' <span class="warn">⚠</span>' : ''}</td>
      <td class="ipv">${esc(d.ip || '—')}</td>
      <td class="mac">${esc(d.mac || '—')}</td>
    </tr>`;
  const group = (cls, title, meta, list) => list.length ? `
    <div class="netgroup ${cls}">
      <div class="ng-h"><b>${title}</b><span class="meta">${esc(meta)} · ${list.length} aparato${list.length !== 1 ? 's' : ''}</span></div>
      <table class="iptab">${list.map(row).join('')}</table>
    </div>` : '';

  let html = '';
  for (const n of state.networks) {
    const list = state.devices.filter(d => d.wifi === n.id && match(d));
    html += group(n.color, `📶 ${esc(n.ssid)}`, [n.band, n.subnet].filter(Boolean).join(' · '), list);
  }
  const wired = state.devices.filter(d => !d.wifi && d.type !== 'internet' && linksOf(d.id).some(l => l.kind === 'cable') && match(d));
  html += group('cable-group', '🔗 Cableados (Ethernet)', 'conexión por cable', wired);
  const off = state.devices.filter(d => !isConnected(d) && match(d));
  html += group('none-group', '⭘ Sin conexión', 'desenchufados', off);

  grid.innerHTML = html || '<p style="color:var(--muted)">Nada que mostrar con ese filtro.</p>';
  $$('tr[data-id]', grid).forEach(r => r.onclick = () => openDevice(r.dataset.id));
}
$('#btn-scan').onclick = () => openOverlay('ov-scan');
$('#btn-add-ip').onclick = () => openForm();

/* ============================================================
   VISTA DATASHEETS
   ============================================================ */
function renderSheets() {
  const grid = $('#sheet-grid');
  const q = query.trim().toLowerCase();
  const cards = [];

  for (const d of state.devices) {
    if (q && !`${d.name} ${d.model}`.toLowerCase().includes(q)) continue;
    if (d.datasheet) {
      cards.push(`
        <div class="sheet">
          <span class="pdf">${d.datasheet.kind === 'url' ? 'WEB' : 'PDF'}</span>
          <b>${esc(d.name)}</b><span class="mod">${esc(d.model || '—')}</span>
          <div class="foot">
            <button class="btn pinky" data-sheet="${d.id}">Ver ${d.datasheet.kind === 'url' ? 'enlace' : 'PDF'}</button>
            <button class="btn ghost" data-map="${d.id}">Ir al mapa</button>
          </div>
        </div>`);
    }
    for (const p of d.peripherals || []) {
      if (!p.datasheet) continue;
      if (q && !`${p.name} ${p.model}`.toLowerCase().includes(q)) continue;
      cards.push(`
        <div class="sheet">
          <span class="pdf">${p.datasheet.kind === 'url' ? 'WEB' : 'PDF'}</span>
          <b>${esc(p.name)}</b><span class="mod">${esc(p.model || '')} · periférico de ${esc(d.name)}</span>
          <div class="foot">
            <button class="btn pinky" data-sheet-per="${d.id}:${p.id}">Ver ${p.datasheet.kind === 'url' ? 'enlace' : 'PDF'}</button>
            <button class="btn ghost" data-map="${d.id}">Ir al mapa</button>
          </div>
        </div>`);
    }
  }
  // pendientes: aparatos sin datasheet
  for (const d of state.devices) {
    if (d.datasheet || d.type === 'internet' || d.type === 'switch' || d.type === 'fijo') continue;
    if (q && !`${d.name} ${d.model}`.toLowerCase().includes(q)) continue;
    cards.push(`
      <div class="sheet pending">
        <span class="pdf">—</span>
        <b>${esc(d.name)}</b><span class="mod">${esc(d.model || 'modelo pendiente ✏️')}</span>
        <div class="foot"><button class="btn ghost" data-edit="${d.id}">＋ Añadir datasheet</button></div>
      </div>`);
  }

  grid.innerHTML = cards.join('') || '<p style="color:var(--muted)">Nada que mostrar con ese filtro.</p>';
  $$('[data-sheet]', grid).forEach(b => b.onclick = () => { const d = dev(b.dataset.sheet); openSheet(d.datasheet, d.name); });
  $$('[data-sheet-per]', grid).forEach(b => b.onclick = () => {
    const [did, pid] = b.dataset.sheetPer.split(':');
    const p = dev(did)?.peripherals.find(x => x.id === pid);
    if (p) openSheet(p.datasheet, p.name);
  });
  $$('[data-map]', grid).forEach(b => b.onclick = () => flashDevice(b.dataset.map));
  $$('[data-edit]', grid).forEach(b => b.onclick = () => openForm(b.dataset.edit));
}

/* ============================================================
   DATOS: exportar / importar / restaurar
   ============================================================ */
$('#btn-data').onclick = e => {
  const r = e.currentTarget.getBoundingClientRect();
  showMenu(r.left, r.bottom + 6, [
    { header: 'Tus datos (solo en este navegador)' },
    { icon: '⇩', label: 'Exportar JSON', action: exportJson },
    { icon: '⇧', label: 'Importar JSON', action: () => $('#file-import').click() },
    { icon: 'ℹ', label: 'Formato de escaneo (futuro)', action: () => openOverlay('ov-scan') },
    { icon: '⟲', label: 'Restaurar ejemplo inicial', action: resetData },
  ]);
  e.stopPropagation();
};

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `red-hogar-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Copia exportada 📄');
}

const fileInput = document.createElement('input');
fileInput.type = 'file'; fileInput.accept = '.json,application/json'; fileInput.id = 'file-import';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);
fileInput.onchange = () => {
  const f = fileInput.files[0];
  if (!f) return;
  f.text().then(txt => {
    const data = JSON.parse(txt);
    if (Array.isArray(data.escaneo)) { importScan(data.escaneo); return; }
    if (Array.isArray(data.devices) && Array.isArray(data.networks)) {
      if (!confirm('¿Sustituir todos los datos actuales por los del archivo?')) return;
      state = data; save(); renderAll();
      toast('Datos importados ✓');
      return;
    }
    toast('El archivo no tiene un formato reconocido', 'warn');
  }).catch(() => toast('No se pudo leer el archivo', 'warn'))
    .finally(() => { fileInput.value = ''; });
};

function importScan(rows) {
  let updated = 0, created = 0;
  for (const r of rows) {
    if (!r || (!r.ip && !r.mac)) continue;
    const mac = (r.mac || '').toUpperCase();
    let d = state.devices.find(x => mac && x.mac.toUpperCase() === mac)
         || state.devices.find(x => r.ip && x.ip === r.ip);
    if (d) {
      if (r.ip) d.ip = r.ip;
      if (mac) d.mac = mac;
      updated++;
    } else {
      const n = state.networks.find(x => x.ssid === r.red);
      state.devices.push({
        id: uid(), name: r.nombre || r.ip || 'Aparato nuevo', type: 'otro', model: '',
        ip: r.ip || '', mac, status: 'on', wifi: n ? n.id : null,
        x: 460 + Math.round(Math.random() * 200), y: 280 + Math.round(Math.random() * 160),
        note: 'Añadido por escaneo', datasheet: null, peripherals: [],
      });
      created++;
    }
  }
  save(); renderAll();
  toast(`Escaneo importado: ${updated} actualizados, ${created} nuevos`);
}

function resetData() {
  if (!confirm('¿Borrar tus datos y volver al esquema de ejemplo inicial?')) return;
  state = seedData(); save(); renderAll();
  toast('Esquema de ejemplo restaurado');
}

/* ============================================================
   Arranque
   ============================================================ */
$('#btn-add').onclick = () => openForm();
$('#fab').onclick = () => openForm();

function renderAll() {
  if (currentView === 'general') renderMap();
  else if (currentView === 'ips') renderIps();
  else if (currentView === 'sheets') renderSheets();
}
renderAll();
