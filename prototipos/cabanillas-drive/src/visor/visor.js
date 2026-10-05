// Visor de comprobación (fase 2), accesible con ?visor: escena con cámara orbital,
// calles OSM superpuestas y comparación del GLB con terrain.f32.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ESCENA } from '../config/escena.js';
import { cargaMundo } from '../escena/mundo.js';
import { compruebaTerreno } from './comprobacion.js';
import { cargaGeoJSON, lineasSobreTerreno } from './lineas.js';

export async function iniciaVisor({ renderer, escena, camara, ui }) {
  camara.position.set(...ESCENA.camara.posicion);
  const controles = new OrbitControls(camara, renderer.domElement);
  controles.target.set(...ESCENA.camara.objetivo);
  controles.enableDamping = true;
  controles.maxPolarAngle = Math.PI / 2 - 0.03;
  controles.minDistance = 5;
  controles.maxDistance = ESCENA.camara.distanciaMax;

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = 'Calles OSM (L)';
  boton.setAttribute('aria-pressed', 'false');
  ui.panel.append(boton);
  let calles = null;
  const alterna = () => {
    if (!calles) return;
    calles.visible = !calles.visible;
    boton.setAttribute('aria-pressed', String(calles.visible));
  };
  boton.addEventListener('click', alterna);
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyL') alterna(); });

  const [mundo, geoCalles] = await Promise.all([
    cargaMundo(renderer, ESCENA, {
      alProgresar: (f) => { ui.estado.textContent = `Cargando escena… ${Math.round(f * 100)} %`; },
    }),
    cargaGeoJSON(ESCENA.rutaCalles),
  ]);
  escena.add(mundo.raiz);
  calles = lineasSobreTerreno(geoCalles, mundo.terreno, ESCENA.calles);
  calles.visible = false;
  escena.add(calles);
  if (import.meta.env.DEV) window.__visor = { THREE, camara, controles, mundo, escena };

  const triangulos = (mallas) => mallas.reduce((s, m) => s + (m.geometry.index?.count ?? 0) / 3, 0);
  ui.estado.textContent = `Visor · terreno ${Math.round(triangulos(mundo.mallasTerreno) / 1000)} k triángulos · `
    + `${mundo.edificios.edificios} edificios (${Math.round(mundo.edificios.triangulos / 1000)} k) · `
    + `${geoCalles.features.length} calles OSM`;
  requestAnimationFrame(() => {
    const r = compruebaTerreno(mundo.mallasTerreno, mundo.terreno, ESCENA.puntosComprobacion);
    ui.estado.textContent += ` · GLB vs terrain.f32: media ${(r.media * 100).toFixed(1)} cm · `
      + `máx ${(r.maxima * 100).toFixed(1)} cm`;
  });

  return { actualiza: () => controles.update() };
}
