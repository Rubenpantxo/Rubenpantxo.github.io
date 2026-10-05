// Fase 3: conducir por Cabanillas. Física a paso fijo (1/60 s) y render a lo que dé la pantalla.
import * as THREE from 'three';
import { ESCENA } from '../config/escena.js';
import { VEHICULO } from '../config/vehiculo.js';
import { creaCamaraCoche } from '../camara/camaraCoche.js';
import { creaEntrada } from '../controles/entrada.js';
import { nodoMasCercano, nodosDeCalles } from '../datos/calles.js';
import { cargaModelosCoches, colisionaCochesAparcados, creaCochesAparcados } from '../escena/coches.js';
import { creaReflejos } from '../escena/entorno.js';
import { cargaMundo } from '../escena/mundo.js';
import { PASO_FISICA, creaFisica } from '../fisica/fisica.js';
import { creaCoche } from '../vehiculo/coche.js';
import { cargaGeoJSON } from '../visor/lineas.js';

const MAX_PASOS_POR_FOTOGRAMA = 4;

export async function iniciaJuego({ renderer, escena, camara, ui }) {
  ui.estado.textContent = 'Cargando Cabanillas…';
  creaReflejos(renderer, escena);
  const [mundo, geoCalles, modelosCoches, aparcados] = await Promise.all([
    cargaMundo(renderer, ESCENA, {
      alProgresar: (f) => { ui.estado.textContent = `Cargando escena… ${Math.round(f * 100)} %`; },
    }),
    cargaGeoJSON(ESCENA.rutaCalles),
    cargaModelosCoches(ESCENA.rutaCoches),
    cargaGeoJSON(ESCENA.rutaCochesAparcados),
  ]);
  escena.add(mundo.raiz);
  const cochesAparcados = creaCochesAparcados(modelosCoches, aparcados, mundo.terreno, { excluir: [VEHICULO.modelo] });
  escena.add(cochesAparcados.raiz);

  ui.estado.textContent = 'Preparando la física…';
  const fisica = await creaFisica(mundo.terreno, mundo.geoEdificios);
  colisionaCochesAparcados(fisica, cochesAparcados.colocados);
  const nodos = nodosDeCalles(geoCalles);
  const coche = creaCoche(fisica, escena, modelosCoches[VEHICULO.modelo]);
  const entrada = creaEntrada(ui.tactil);
  const camaraCoche = creaCamaraCoche(camara, fisica, mundo.terreno, coche);

  // Salida: el nodo de calle más cercano al origen (centro del casco)
  function colocaEn(nodo) {
    const y = mundo.terreno.alturaEn(nodo.x, nodo.z) + VEHICULO.reinicio.alturaSobreSuelo;
    coche.recoloca(nodo.x, y, nodo.z, nodo.dx, nodo.dz);
  }
  const salida = nodoMasCercano(nodos, 0, 0, { excluirServicio: true });
  colocaEn(salida);
  ui.estado.textContent = '';
  ui.ayuda.hidden = false;

  let acumulado = 0;
  let tiempoVolcado = 0;
  let tiempoReparto = 0;
  let fotogramas = 0;
  let tiempoFps = 0;
  let fps = 0;

  function recolocaCerca() {
    const e = coche.estado();
    colocaEn(nodoMasCercano(nodos, e.posicion.x, e.posicion.z));
    tiempoVolcado = 0;
  }

  function actualiza(dt) {
    const mandos = entrada.actualiza();
    if (entrada.consume('reiniciar')) recolocaCerca();
    if (entrada.consume('camara')) camaraCoche.cambia();

    acumulado += Math.min(dt, PASO_FISICA * MAX_PASOS_POR_FOTOGRAMA);
    while (acumulado >= PASO_FISICA) {
      coche.aplicaEntrada(mandos, PASO_FISICA);
      coche.paso(PASO_FISICA);
      fisica.mundo.step();
      acumulado -= PASO_FISICA;
    }
    coche.sincroniza();

    const e = coche.estado();
    const suelo = mundo.terreno.alturaEn(e.posicion.x, e.posicion.z);
    if (e.posicion.y < suelo - VEHICULO.reinicio.caidaMaxima) recolocaCerca();
    tiempoVolcado = e.volcado ? tiempoVolcado + dt : 0;

    camaraCoche.actualiza(dt);
    tiempoReparto -= dt;
    if (tiempoReparto <= 0) {
      cochesAparcados.actualiza(camara.position, ESCENA.distanciaCochesDetalle);
      tiempoReparto = ESCENA.segundosRepartoCoches;
    }

    fotogramas++;
    tiempoFps += dt;
    if (tiempoFps >= 0.5) {
      fps = Math.round(fotogramas / tiempoFps);
      fotogramas = 0;
      tiempoFps = 0;
    }
    ui.velocidad.textContent = `${Math.round(Math.abs(e.velocidadKmh))} km/h`;
    ui.estado.textContent = tiempoVolcado > VEHICULO.reinicio.segundosVolcado
      ? 'Coche volcado: pulsa R (o ↺) para recolocarlo'
      : (ui.mostrarFps ? `${fps} FPS` : '');
  }

  const api = { mundo, fisica, coche, entrada, camaraCoche, nodos, cochesAparcados, modelosCoches,
    get fps() { return fps; } };
  if (import.meta.env.DEV) window.__juego = Object.assign(api, { THREE, camara, escena, colocaEn });
  return { actualiza, api };
}
