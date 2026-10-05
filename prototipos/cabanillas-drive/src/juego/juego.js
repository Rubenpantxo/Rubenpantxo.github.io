// Conducir por Cabanillas. Física a paso fijo (1/60 s) y render a lo que dé la pantalla.
// En pausa (o en la pantalla de inicio) la física se detiene y la cámara gira despacio alrededor del coche.
import * as THREE from 'three';
import { CALIDAD } from '../config/calidad.js';
import { ESCENA } from '../config/escena.js';
import { VEHICULO } from '../config/vehiculo.js';
import { creaCamaraCoche } from '../camara/camaraCoche.js';
import { creaEntrada } from '../controles/entrada.js';
import { nodoMasCercano, nodosDeCalles } from '../datos/calles.js';
import { cargaModelosArboles, colisionaArboles, creaArboles } from '../escena/arboles.js';
import { cargaVegetacion, creaHierba } from '../escena/hierba.js';
import { cargaModelosCoches, colisionaCochesAparcados, creaCochesAparcados } from '../escena/coches.js';
import { creaReflejos } from '../escena/entorno.js';
import { creaHud } from '../hud/hud.js';
import { cargaMundo } from '../escena/mundo.js';
import { PASO_FISICA, creaFisica } from '../fisica/fisica.js';
import { creaCoche } from '../vehiculo/coche.js';
import { cargaGeoJSON } from '../visor/lineas.js';

const MAX_PASOS_POR_FOTOGRAMA = 4;

export async function iniciaJuego({ renderer, escena, camara, ui }) {
  ui.estado.textContent = 'Cargando Cabanillas…';
  creaReflejos(renderer, escena);
  const [mundo, geoCalles, modelosCoches, aparcados, modelosArboles, datosArboles, vegetacion] = await Promise.all([
    cargaMundo(renderer, ESCENA, {
      alProgresar: (f) => { ui.estado.textContent = `Cargando escena… ${Math.round(f * 100)} %`; },
    }),
    cargaGeoJSON(ESCENA.rutaCalles),
    cargaModelosCoches(ESCENA.rutaCoches),
    cargaGeoJSON(ESCENA.rutaCochesAparcados),
    cargaModelosArboles(ESCENA.rutaModelosArboles),
    cargaGeoJSON(ESCENA.rutaArboles),
    cargaVegetacion(ESCENA.rutaVegetacion),
  ]);
  escena.add(mundo.raiz);
  const cochesAparcados = creaCochesAparcados(modelosCoches, aparcados, mundo.terreno, { excluir: [VEHICULO.modelo] });
  escena.add(cochesAparcados.raiz);
  const arboles = creaArboles(renderer, modelosArboles, datosArboles, mundo.terreno, { entorno: escena });
  escena.add(arboles.raiz);
  const hierba = creaHierba(vegetacion, mundo.terreno, { radio: CALIDAD.radioHierba });
  escena.add(hierba.raiz);

  ui.estado.textContent = 'Preparando la física…';
  const fisica = await creaFisica(mundo.terreno, mundo.geoEdificios);
  colisionaCochesAparcados(fisica, cochesAparcados.colocados);
  colisionaArboles(fisica, arboles.colocados);
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
  const hud = await creaHud(mundo);
  ui.estado.textContent = '';

  let acumulado = 0;
  let tiempoVolcado = 0;
  let tiempoReparto = 0;
  let fotogramas = 0;
  let tiempoFps = 0;
  let fps = 0;
  let pausado = true;
  let anguloOrbita = 0;
  const centroOrbita = new THREE.Vector3();

  function recolocaCerca() {
    const e = coche.estado();
    colocaEn(nodoMasCercano(nodos, e.posicion.x, e.posicion.z));
    tiempoVolcado = 0;
  }

  // Cámara de presentación: vuelta lenta alrededor del coche, algo elevada
  function orbita(dt) {
    anguloOrbita += dt * 0.12;
    const e = coche.estado();
    centroOrbita.copy(e.posicion);
    const r = 16;
    camara.position.set(centroOrbita.x + Math.sin(anguloOrbita) * r, centroOrbita.y + 6, centroOrbita.z + Math.cos(anguloOrbita) * r);
    camara.lookAt(centroOrbita.x, centroOrbita.y + 1.2, centroOrbita.z);
  }

  function actualiza(dt) {
    if (pausado) {
      orbita(dt);
      arboles.avanza(dt);
      hierba.avanza(dt);
      hierba.actualiza(camara.position);
      tiempoReparto -= dt;
      if (tiempoReparto <= 0) {
        cochesAparcados.actualiza(camara.position, ESCENA.distanciaCochesDetalle);
        arboles.actualiza(camara.position, CALIDAD.distanciaArbolesDetalle);
        tiempoReparto = ESCENA.segundosRepartoCoches;
      }
      return;
    }
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
    arboles.avanza(dt);
    hierba.avanza(dt);
    hierba.actualiza(camara.position);
    tiempoReparto -= dt;
    if (tiempoReparto <= 0) {
      cochesAparcados.actualiza(camara.position, ESCENA.distanciaCochesDetalle);
      arboles.actualiza(camara.position, CALIDAD.distanciaArbolesDetalle);
      tiempoReparto = ESCENA.segundosRepartoCoches;
    }

    fotogramas++;
    tiempoFps += dt;
    if (tiempoFps >= 0.5) {
      fps = Math.round(fotogramas / tiempoFps);
      fotogramas = 0;
      tiempoFps = 0;
    }
    hud.actualiza(e, dt);
    ui.estado.textContent = tiempoVolcado > VEHICULO.reinicio.segundosVolcado
      ? 'Coche volcado: pulsa R (o ↺) para recolocarlo'
      : (ui.mostrarFps ? `${fps} FPS` : '');
  }

  const api = { mundo, fisica, coche, entrada, camaraCoche, nodos, cochesAparcados, modelosCoches, arboles, hierba, hud,
    get fps() { return fps; },
    get pausado() { return pausado; },
    // Al volver de la pausa no se recupera el tiempo parado (la física no da un salto)
    ponPausa(valor) {
      pausado = valor;
      acumulado = 0;
      hud.mostrar(!valor);
    },
  };
  if (import.meta.env.DEV) window.__juego = Object.assign(api, { THREE, renderer, camara, escena, colocaEn });
  return { actualiza, api };
}
