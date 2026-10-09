/**
 * FICHA DE UN SISTEMA DE DISEÑO
 *
 *   - El objeto 3D del sistema (el mismo de la vitrina de la portada), que se
 *     gira arrastrando con inercia y vuelve solo a su pose.
 *   - Las secciones entran al acercarse.
 *   - "Copiar los tokens": las variables --sd-* que tiene puestas la página
 *     ahora mismo, listas para pegar en un :root.
 *   - Probador de tipografía: escribe el nombre de tu negocio y cambia el
 *     tamaño de la muestra.
 *
 * La ficha sabe qué sistema es por <html data-preset="…">.
 */
import { crearEscena, THREE } from '../servicios/kit/escena.js';
import { fabricas } from './sistemas-materiales.js';

const $ = id => document.getElementById(id);
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const preset = document.documentElement.dataset.preset;

/* ---------- el objeto ---------- */
function crearObjeto() {
  const caja = $('fx-objeto');
  const lienzo = $('fx-lienzo');
  if (!caja || !lienzo) return;
  let obj = null;
  const giro = { y: 0, x: 0, vy: 0, vx: 0 };
  let arrastrando = false, ultimo = null;

  const e = crearEscena(lienzo, {
    contenedor: caja,
    camara: { fov: 30, fovVertical: 36, pos: [0, 0.15, 5.2], mira: [0, 0, 0] },
    luz: 2.1, solPos: [3, 5, 6], ambiente: 0.6,
    cuadro: (t, dt) => {
      if (!obj) return false;
      if (!arrastrando) {
        // inercia y vuelta suave a la pose de reposo
        giro.y += giro.vy; giro.x += giro.vx;
        giro.vy *= 0.94; giro.vx *= 0.9;
        giro.x += (0 - giro.x) * Math.min(1, dt * 3);
        if (!reducido) giro.y += dt * 0.25;
      }
      obj.rotation.set(giro.x, giro.y, 0);
      if (!reducido) obj.position.y = Math.sin(t * 1.1) * 0.06;
      obj.userData.vivo?.(t, !reducido);
      return !reducido || arrastrando || Math.abs(giro.vy) > 1e-4 || Math.abs(giro.x) > 1e-3;
    }
  });
  if (!e) return;

  const hacer = fabricas(e)[preset];
  if (!hacer) return;
  obj = new THREE.Group();
  obj.add(hacer());
  obj.scale.setScalar(1.3);
  e.scene.add(obj);
  caja.classList.add('is-listo');
  e.pedir(2);

  lienzo.addEventListener('pointerdown', ev => {
    arrastrando = true; ultimo = { x: ev.clientX, y: ev.clientY };
    giro.vy = giro.vx = 0;
    lienzo.setPointerCapture(ev.pointerId);
    e.animarDurante(60000);
  });
  lienzo.addEventListener('pointermove', ev => {
    if (!arrastrando) return;
    const dx = ev.clientX - ultimo.x, dy = ev.clientY - ultimo.y;
    ultimo = { x: ev.clientX, y: ev.clientY };
    giro.y += dx * 0.012; giro.x = Math.max(-0.7, Math.min(0.7, giro.x + dy * 0.008));
    giro.vy = dx * 0.012; giro.vx = dy * 0.004;
  });
  const soltar = () => { if (!arrastrando) return; arrastrando = false; e.animarDurante(2500); };
  lienzo.addEventListener('pointerup', soltar);
  lienzo.addEventListener('pointercancel', soltar);
}

/* ---------- secciones que entran ---------- */
const vigia = new IntersectionObserver(ents => ents.forEach(en => {
  if (!en.isIntersecting) return;
  en.target.classList.add('is-visto');
  vigia.unobserve(en.target);
}), { threshold: 0.08 });
document.querySelectorAll('.fx-seccion').forEach(s => vigia.observe(s));

/* ---------- copiar los tokens ---------- */
const TOKENS = ['bg', 'surface', 'surface-2', 'ink', 'muted', 'accent', 'accent-solid', 'accent-strong', 'accent-text',
  'on-accent', 'accent-2', 'line', 'ok', 'warn', 'danger', 'radius', 'radius-btn', 'radius-activo', 'border',
  'shadow-sm', 'shadow-md', 'shadow-lg', 'font', 'display', 'mono', 'display-peso', 'icon-stroke'];
const estado = document.querySelector('[data-copiar-estado]');
document.querySelector('[data-copiar-tokens]')?.addEventListener('click', async ev => {
  const b = ev.currentTarget;
  const cs = getComputedStyle(document.documentElement);
  const lineas = TOKENS.map(t => [t, cs.getPropertyValue(`--sd-${t}`).trim()]).filter(([, v]) => v).map(([t, v]) => `  --sd-${t}: ${v};`);
  const css = `/* ${document.title} */\n:root {\n${lineas.join('\n')}\n}\n`;
  let ok = false;
  try { await navigator.clipboard.writeText(css); ok = true; } catch (e) { /* sin portapapeles */ }
  const antes = b.textContent;
  b.textContent = ok ? `Copiados ${lineas.length} tokens ✓` : 'No se pudo copiar';
  b.classList.add('is-hecho');
  if (estado) estado.textContent = ok ? `Copiados ${lineas.length} tokens al portapapeles` : 'No se pudo copiar al portapapeles';
  setTimeout(() => { b.textContent = antes; b.classList.remove('is-hecho'); }, 1800);
});

/* ---------- probador de tipografía ---------- */
const texto = $('fx-texto');
const escala = $('fx-escala');
const muestras = [...document.querySelectorAll('#tipografia .sd-muestra-display, #tipografia .sd-muestra-titulo')];
const originales = muestras.map(m => m.textContent);
texto?.addEventListener('input', () => {
  const v = texto.value.trim();
  muestras.forEach((m, i) => { m.textContent = v || originales[i]; });
});
escala?.addEventListener('input', () => {
  document.querySelector('#tipografia .sd-tipo')?.style.setProperty('--fx-escala', escala.value);
});

crearObjeto();
