// HUD del juego: brújula, minimapa y velocímetro (index.html #hud).
import { ESCENA } from '../config/escena.js';
import { cargaGeoJSON } from '../visor/lineas.js';
import { creaBrujula } from './brujula.js';
import { creaMinimapa } from './minimapa.js';
import { creaVelocimetro } from './velocimetro.js';

export async function creaHud(mundo, { lugares = [] } = {}) {
  const [calles, caminos, agua, usos] = await Promise.all(
    [ESCENA.rutaCalles, ESCENA.rutaCaminos, ESCENA.rutaAgua, ESCENA.rutaUsos].map((r) => cargaGeoJSON(r).catch(() => null)));
  const meta = mundo.terreno.meta;
  const zona = { x0: meta.vertice_0.x, z0: meta.vertice_0.z, ancho: meta['tamaño_x_m'], alto: meta['tamaño_z_m'] };
  const contenedor = document.getElementById('hud');
  const brujula = creaBrujula(document.getElementById('brujula'));
  const minimapa = creaMinimapa(document.getElementById('minimapa'),
    { calles, caminos, agua, usos, edificios: mundo.geoEdificios }, zona, lugares);
  const velocimetro = creaVelocimetro(document.getElementById('velocimetro'));

  const alterna = () => minimapa.alternaGiro();
  document.getElementById('minimapa').addEventListener('click', alterna);
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !contenedor.hidden) alterna(); });

  return {
    mostrar(visible) { contenedor.hidden = !visible; },
    actualiza(estado, dt, otros = []) {
      if (contenedor.hidden) return;
      // Rumbo desde el norte en sentido horario (norte = −Z, este = +X)
      const rumbo = Math.atan2(estado.adelante.x, -estado.adelante.z);
      brujula.actualiza(rumbo);
      minimapa.actualiza({ x: estado.posicion.x, z: estado.posicion.z, rumbo, kmh: estado.velocidadKmh, otros }, dt);
      velocimetro.actualiza(estado.velocidadKmh, dt);
    },
  };
}
