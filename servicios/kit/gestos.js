/**
 * GESTOS Y MICROINTERACCIONES COMUNES
 *
 * Piezas pequeñas que todas las demos necesitan y que no deberían reescribirse
 * ocho veces: muelles, arrastre con inercia, cifras que ruedan, listas que se
 * recolocan sin saltos (FLIP), hojas inferiores, avisos y memoria local.
 *
 * Nada de esto pinta: el aspecto lo pone cada app con su CSS.
 */

export const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- memoria local (falla en silencio en modo privado) ---------- */
export function leer(clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v === null ? porDefecto : JSON.parse(v);
  } catch (e) { return porDefecto; }
}
export function guardar(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin memoria */ }
}

/* ---------- vibración corta, donde exista ---------- */
export function vibrar(patron = 8) {
  try { if (navigator.vibrate && !reducido()) navigator.vibrate(patron); } catch (e) { /* nada */ }
}

/* ---------- muelle crítico-amortiguado ----------
   const m = muelle(0, { rigidez: 170, amortiguacion: 18 });
   m.a(1); en cada fotograma: m.paso(dt); usar m.valor; m.quieto indica fin */
export function muelle(inicial = 0, { rigidez = 170, amortiguacion = 20, masa = 1 } = {}) {
  return {
    valor: inicial, vel: 0, objetivo: inicial,
    a(v) { this.objetivo = v; return this; },
    fijar(v) { this.valor = this.objetivo = v; this.vel = 0; return this; },
    paso(dt) {
      // pasos fijos de 1/120 s para que sea estable aunque el fotograma tarde
      let t = Math.min(dt, 0.064);
      while (t > 0) {
        const h = Math.min(t, 1 / 120);
        const f = -rigidez * (this.valor - this.objetivo) - amortiguacion * this.vel;
        this.vel += (f / masa) * h;
        this.valor += this.vel * h;
        t -= h;
      }
      return this.valor;
    },
    get quieto() { return Math.abs(this.vel) < 1e-3 && Math.abs(this.valor - this.objetivo) < 1e-3; }
  };
}

/* ---------- arrastre con inercia (girar objetos 3D, carruseles) ----------
   arrastre(el, { alMover(dx, dy, ev), alSoltar(vx, vy), alTocar(ev) })
   Distingue toque de arrastre: menos de 6 px es un toque. */
export function arrastre(el, { alEmpezar, alMover, alSoltar, alTocar, umbral = 6 } = {}) {
  let id = null, x0 = 0, y0 = 0, x = 0, y = 0, t = 0, vx = 0, vy = 0, movido = false;
  el.style.touchAction = el.style.touchAction || 'pan-y';
  el.addEventListener('pointerdown', ev => {
    if (id !== null || ev.button > 0) return;
    id = ev.pointerId; x0 = x = ev.clientX; y0 = y = ev.clientY; t = performance.now();
    vx = vy = 0; movido = false;
    alEmpezar?.(ev);
  });
  el.addEventListener('pointermove', ev => {
    if (ev.pointerId !== id) return;
    const dx = ev.clientX - x, dy = ev.clientY - y;
    if (!movido && Math.hypot(ev.clientX - x0, ev.clientY - y0) > umbral) {
      movido = true;
      try { el.setPointerCapture(id); } catch (e) { /* nada */ }
    }
    if (!movido) return;
    const ahora = performance.now(), dtt = Math.max(1, ahora - t);
    vx = vx * 0.6 + (dx / dtt) * 0.4; vy = vy * 0.6 + (dy / dtt) * 0.4;
    x = ev.clientX; y = ev.clientY; t = ahora;
    alMover?.(dx, dy, ev);
  });
  const fin = ev => {
    if (ev.pointerId !== id) return;
    id = null;
    if (movido) alSoltar?.(vx, vy, ev);
    else if (ev.type === 'pointerup') alTocar?.(ev);
  };
  el.addEventListener('pointerup', fin);
  el.addEventListener('pointercancel', fin);
}

/* ---------- cifras que ruedan ----------
   contar(el, 12.5, { decimales: 2, sufijo: ' €' }) */
const enCurso = new WeakMap();
export function contar(el, valor, { decimales = 0, prefijo = '', sufijo = '', duracion = 520, separador = ',' } = {}) {
  const fmt = v => prefijo + v.toFixed(decimales).replace('.', separador).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + sufijo;
  const desde = enCurso.get(el)?.actual ?? parseFloat((el.dataset.valor || '0'));
  el.dataset.valor = valor;
  cancelAnimationFrame(enCurso.get(el)?.raf);
  if (reducido() || desde === valor) { el.textContent = fmt(valor); enCurso.delete(el); return; }
  const t0 = performance.now();
  const est = { actual: desde, raf: 0 };
  enCurso.set(el, est);
  const paso = ahora => {
    const k = Math.min(1, (ahora - t0) / duracion);
    const e = 1 - Math.pow(1 - k, 4);
    est.actual = desde + (valor - desde) * e;
    el.textContent = fmt(est.actual);
    if (k < 1) est.raf = requestAnimationFrame(paso);
    else enCurso.delete(el);
  };
  est.raf = requestAnimationFrame(paso);
}

/* ---------- FLIP: la lista cambia y cada elemento viaja a su sitio ----------
   flip(contenedor, () => { ...reordenar o añadir hijos... }) */
export function flip(contenedor, mutar, { duracion = 380, curva = 'cubic-bezier(.2,.8,.2,1)' } = {}) {
  const hijos = () => Array.from(contenedor.children);
  const antes = new Map(hijos().map(h => [h, h.getBoundingClientRect()]));
  mutar();
  if (reducido()) return;
  for (const h of hijos()) {
    const a = antes.get(h);
    const d = h.getBoundingClientRect();
    if (!a) {
      h.animate([{ opacity: 0, transform: 'scale(.92) translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: duracion, easing: curva });
      continue;
    }
    const dx = a.left - d.left, dy = a.top - d.top;
    if (dx || dy) h.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: duracion, easing: curva });
  }
}

/* ---------- avisos (toast) con región aria-live ---------- */
let zonaAvisos = null;
export function avisar(texto, { tipo = 'info', icono = '', ms = 2600 } = {}) {
  if (!zonaAvisos) {
    zonaAvisos = document.createElement('div');
    zonaAvisos.className = 'k-avisos';
    zonaAvisos.setAttribute('role', 'status');
    zonaAvisos.setAttribute('aria-live', 'polite');
    document.body.appendChild(zonaAvisos);
  }
  const a = document.createElement('div');
  a.className = `k-aviso k-aviso--${tipo}`;
  if (icono) {
    const i = document.createElement('span');
    i.className = 'k-aviso-ico';
    i.setAttribute('aria-hidden', 'true');
    i.textContent = icono;
    a.appendChild(i);
  }
  a.append(texto);
  zonaAvisos.appendChild(a);
  requestAnimationFrame(() => a.classList.add('is-in'));
  setTimeout(() => {
    a.classList.remove('is-in');
    a.addEventListener('transitionend', () => a.remove(), { once: true });
    setTimeout(() => a.remove(), 600);
  }, ms);
}

/* ---------- hoja inferior con arrastre para cerrar ----------
   const h = hoja(document.getElementById('mi-hoja')); h.abrir(); h.cerrar();
   Estructura: <div class="k-hoja" hidden><div class="k-hoja-panel">
                 <div class="k-hoja-asa"></div>…</div></div> */
export function hoja(raiz, { alCerrar } = {}) {
  const panel = raiz.querySelector('.k-hoja-panel');
  const asa = raiz.querySelector('.k-hoja-asa') || panel;
  let foco = null;
  const cerrar = () => {
    if (raiz.hidden || raiz.classList.contains('is-saliendo')) return;
    raiz.classList.remove('is-open');
    raiz.classList.add('is-saliendo');
    const fin = () => { raiz.hidden = true; raiz.classList.remove('is-saliendo'); panel.style.transform = ''; };
    if (reducido()) fin(); else setTimeout(fin, 320);
    foco?.focus?.();
    alCerrar?.();
  };
  const abrir = () => {
    foco = document.activeElement;
    raiz.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.add('is-open')));
    const primero = panel.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    setTimeout(() => (primero || panel).focus({ preventScroll: true }), 60);
  };
  raiz.addEventListener('click', e => { if (e.target === raiz) cerrar(); });
  raiz.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });
  raiz.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', cerrar));
  let y0 = null, dy = 0;
  asa.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; asa.setPointerCapture(e.pointerId); panel.style.transition = 'none'; });
  asa.addEventListener('pointermove', e => {
    if (y0 === null) return;
    dy = Math.max(0, e.clientY - y0);
    panel.style.transform = `translateY(${dy}px)`;
  });
  const soltar = () => {
    if (y0 === null) return;
    y0 = null; panel.style.transition = '';
    if (dy > 90) cerrar(); else panel.style.transform = '';
  };
  asa.addEventListener('pointerup', soltar);
  asa.addEventListener('pointercancel', soltar);
  return { abrir, cerrar, get abierta() { return !raiz.hidden; } };
}

/* ---------- pestañas con indicador que se desliza ----------
   pestanas(nav, { alCambiar(id) }) — botones con data-vista="id" y
   paneles con data-panel="id". Recuerda la última en sessionStorage. */
export function pestanas(nav, { alCambiar, clave } = {}) {
  const botones = Array.from(nav.querySelectorAll('[data-vista]'));
  const paneles = Array.from(document.querySelectorAll('[data-panel]'));
  const marca = nav.querySelector('.k-tabs-marca');
  function ir(id, { foco = false } = {}) {
    botones.forEach(b => {
      const si = b.dataset.vista === id;
      b.setAttribute('aria-selected', si);
      b.tabIndex = si ? 0 : -1;
      if (si && marca) {
        marca.style.setProperty('--x', `${b.offsetLeft}px`);
        marca.style.setProperty('--w', `${b.offsetWidth}px`);
      }
      if (si && foco) b.focus();
    });
    paneles.forEach(p => {
      const si = p.dataset.panel === id;
      if (si && p.hidden) {
        p.hidden = false;
        if (!reducido()) p.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
      } else if (!si) p.hidden = true;
    });
    if (clave) try { sessionStorage.setItem(clave, id); } catch (e) { /* nada */ }
    alCambiar?.(id);
  }
  botones.forEach((b, i) => {
    b.addEventListener('click', () => { vibrar(6); ir(b.dataset.vista); });
    b.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      ir(botones[(i + d + botones.length) % botones.length].dataset.vista, { foco: true });
    });
  });
  let inicial = botones[0]?.dataset.vista;
  if (clave) try { inicial = sessionStorage.getItem(clave) || inicial; } catch (e) { /* nada */ }
  if (!botones.some(b => b.dataset.vista === inicial)) inicial = botones[0]?.dataset.vista;
  requestAnimationFrame(() => ir(inicial));
  window.addEventListener('resize', () => {
    const activa = botones.find(b => b.getAttribute('aria-selected') === 'true');
    if (activa && marca) {
      marca.style.setProperty('--x', `${activa.offsetLeft}px`);
      marca.style.setProperty('--w', `${activa.offsetWidth}px`);
    }
  });
  return { ir };
}

/* ---------- onda al pulsar en [data-onda] ---------- */
export function ondas(raiz = document) {
  raiz.addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-onda]');
    if (!el || reducido()) return;
    const r = el.getBoundingClientRect();
    const o = document.createElement('span');
    o.className = 'k-onda';
    const d = Math.max(r.width, r.height) * 2;
    o.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    el.appendChild(o);
    o.addEventListener('animationend', () => o.remove());
  });
}

/* ---------- confeti ligero (éxito de un pedido) ---------- */
export function confeti(origen, colores = ['#ffb703', '#fb5607', '#3a86ff', '#8338ec', '#06d6a0']) {
  if (reducido()) return;
  const r = origen.getBoundingClientRect();
  const capa = document.createElement('div');
  capa.className = 'k-confeti';
  capa.setAttribute('aria-hidden', 'true');
  document.body.appendChild(capa);
  for (let i = 0; i < 36; i++) {
    const p = document.createElement('i');
    p.style.background = colores[i % colores.length];
    p.style.left = `${r.left + r.width / 2}px`;
    p.style.top = `${r.top + r.height / 2}px`;
    capa.appendChild(p);
    const ang = (i / 36) * Math.PI * 2 + Math.random() * 0.3;
    const v = 90 + Math.random() * 140;
    p.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${Math.cos(ang) * v}px, ${Math.sin(ang) * v + 160}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
    ], { duration: 1000 + Math.random() * 500, easing: 'cubic-bezier(.15,.6,.4,1)', fill: 'forwards' });
  }
  setTimeout(() => capa.remove(), 1700);
}

/* ---------- formato ---------- */
export const euros = (v, dec = 2) => v.toFixed(dec).replace('.', ',') + ' €';
export const dosCifras = n => String(n).padStart(2, '0');
