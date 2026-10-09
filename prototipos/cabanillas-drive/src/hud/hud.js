// HUD del juego: minimapa (se amplía al tocarlo) y velocímetro (index.html #hud).
import { ESCENA } from '../config/escena.js';
import { HUD } from '../config/hud.js';
import { cargaGeoJSON } from '../visor/lineas.js';
import { leeAjustes } from './ajustes.js';
import { creaMinimapa } from './minimapa.js';
import { creaVelocimetro } from './velocimetro.js';

export async function creaHud(mundo, { lugares = [] } = {}) {
  const [calles, caminos, agua, usos] = await Promise.all(
    [ESCENA.rutaCalles, ESCENA.rutaCaminos, ESCENA.rutaAgua, ESCENA.rutaUsos].map((r) => cargaGeoJSON(r).catch(() => null)));
  const meta = mundo.terreno.meta;
  const zona = { x0: meta.vertice_0.x, z0: meta.vertice_0.z, ancho: meta['tamaño_x_m'], alto: meta['tamaño_z_m'] };
  const contenedor = document.getElementById('hud');
  const minimapa = creaMinimapa(document.getElementById('minimapa'),
    { calles, caminos, agua, usos, edificios: mundo.geoEdificios }, zona, lugares);
  const velocimetro = creaVelocimetro(document.getElementById('velocimetro'));
  // Ajustes: el minimapa gira con el coche o va con el norte arriba
  minimapa.ponGiro(leeAjustes().minimapaGira);
  window.addEventListener('cabanillas:ajustes', (e) => minimapa.ponGiro(e.detail.minimapaGira));
  let ultimo = { x: zona.x0 + zona.ancho / 2, z: zona.z0 + zona.alto / 2, rumbo: 0, otros: [] };

  // Clic o toque: mapa ampliado (pantallas.js lo abre y pausa). M gira el minimapa.
  document.getElementById('minimapa').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cabanillas:mapa'));
  });
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !contenedor.hidden) minimapa.alternaGiro(); });

  // --- Mapa ampliado: arrastrar para mover, rueda o pellizco para acercar
  const lienzoGrande = document.getElementById('mapa-lienzo');
  const vista = { zoom: 1, cx: 0, cz: 0 };
  let escalaGrande = 1;
  let pendiente = false;
  const vistaCompleta = () => {
    vista.cx = zona.x0 + zona.ancho / 2;
    vista.cz = zona.z0 + zona.alto / 2;
    vista.zoom = 1;
  };
  const limita = () => {
    vista.zoom = Math.min(HUD.minimapa.zoomMaxGrande, Math.max(1, vista.zoom));
    vista.cx = Math.min(zona.x0 + zona.ancho, Math.max(zona.x0, vista.cx));
    vista.cz = Math.min(zona.z0 + zona.alto, Math.max(zona.z0, vista.cz));
  };
  const dibuja = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      if (lienzoGrande.closest('[hidden]')) return;
      ({ escala: escalaGrande } = minimapa.dibujaGrande(lienzoGrande, ultimo, vista));
    });
  };
  // Acerca manteniendo quieto el punto bajo el cursor o entre los dedos (px de CSS)
  const acerca = (factor, px, py) => {
    const r = Math.min(window.devicePixelRatio, 2);
    const rect = lienzoGrande.getBoundingClientRect();
    const mx = vista.cx + ((px - rect.left) * r - lienzoGrande.width / 2) / escalaGrande;
    const mz = vista.cz + ((py - rect.top) * r - lienzoGrande.height / 2) / escalaGrande;
    const antes = vista.zoom;
    vista.zoom = Math.min(HUD.minimapa.zoomMaxGrande, Math.max(1, vista.zoom * factor));
    const k = antes / vista.zoom;
    vista.cx = mx + (vista.cx - mx) * k;
    vista.cz = mz + (vista.cz - mz) * k;
    limita();
    dibuja();
  };
  lienzoGrande.addEventListener('wheel', (e) => {
    e.preventDefault();
    acerca(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
  }, { passive: false });
  const dedos = new Map();
  lienzoGrande.addEventListener('pointerdown', (e) => {
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { lienzoGrande.setPointerCapture(e.pointerId); } catch { /* nada */ }
  });
  lienzoGrande.addEventListener('pointermove', (e) => {
    const antes = dedos.get(e.pointerId);
    if (!antes) return;
    const r = Math.min(window.devicePixelRatio, 2);
    if (dedos.size === 1) {
      vista.cx -= ((e.clientX - antes.x) * r) / escalaGrande;
      vista.cz -= ((e.clientY - antes.y) * r) / escalaGrande;
      limita();
      dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dibuja();
      return;
    }
    const [a, b] = [...dedos.values()];
    const separacion = Math.hypot(a.x - b.x, a.y - b.y);
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [c, d] = [...dedos.values()];
    if (separacion > 0) acerca(Math.hypot(c.x - d.x, c.y - d.y) / separacion, (c.x + d.x) / 2, (c.y + d.y) / 2);
  });
  const suelta = (e) => dedos.delete(e.pointerId);
  lienzoGrande.addEventListener('pointerup', suelta);
  lienzoGrande.addEventListener('pointercancel', suelta);
  document.getElementById('mapa-centrar').addEventListener('click', () => {
    vista.cx = ultimo.x;
    vista.cz = ultimo.z;
    vista.zoom = Math.max(vista.zoom, 3);
    limita();
    dibuja();
  });
  document.getElementById('mapa-todo').addEventListener('click', () => { vistaCompleta(); dibuja(); });
  // Al abrirse, vista de todo el pueblo
  new MutationObserver(() => {
    if (lienzoGrande.closest('[hidden]')) return;
    vistaCompleta();
    dibuja();
  }).observe(document.getElementById('mapa'), { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('resize', dibuja);
  vistaCompleta();

  return {
    mostrar(visible) { contenedor.hidden = !visible; },
    actualiza(estado, dt, otros = []) {
      // Rumbo desde el norte en sentido horario (norte = −Z, este = +X)
      const rumbo = Math.atan2(estado.adelante.x, -estado.adelante.z);
      ultimo = { x: estado.posicion.x, z: estado.posicion.z, rumbo, otros };
      if (contenedor.hidden) return;
      minimapa.actualiza({ x: estado.posicion.x, z: estado.posicion.z, rumbo, kmh: estado.velocidadKmh, otros }, dt);
      velocimetro.actualiza(estado.velocidadKmh, dt);
    },
  };
}
