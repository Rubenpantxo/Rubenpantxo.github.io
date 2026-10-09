// Conducir por Cabanillas. Física a paso fijo (1/60 s) y render a lo que dé la pantalla.
// En pausa (o en la pantalla de inicio) la física se detiene y la cámara gira despacio alrededor del coche.
import * as THREE from 'three';
import { CALIDAD } from '../config/calidad.js';
import { ESCENA } from '../config/escena.js';
import { VEHICULO } from '../config/vehiculo.js';
import { creaCamaraCoche } from '../camara/camaraCoche.js';
import { creaEntrada } from '../controles/entrada.js';
import { nodoMasCercano, nodosDeCalles } from '../datos/calles.js';
import { creaGrafoCalles } from '../datos/grafoCalles.js';
import { cargaModelosArboles, colisionaArboles, creaArboles } from '../escena/arboles.js';
import { cargaVegetacion, creaHierba } from '../escena/hierba.js';
import { cargaModelosCoches, colisionaCochesAparcados, creaCochesAparcados } from '../escena/coches.js';
import { creaReflejos } from '../escena/entorno.js';
import { creaHud } from '../hud/hud.js';
import { creaCarteles } from '../escena/carteles.js';
import { cargaMuros, creaMuros } from '../escena/muros.js';
import { cargaElementos, creaElementos } from '../escena/elementos.js';
import { avanzaAgua, creaCanal } from '../escena/agua.js';
import { creaTrafico } from './trafico.js';
import { creaPeaton } from './peaton.js';
import { creaLuces } from './luces.js';
import { cargaPersonas, creaPeatones } from './peatones.js';
import { textoHora } from '../escena/cicloDia.js';
import { PEATON } from '../config/peaton.js';
import { cargaMundo } from '../escena/mundo.js';
import { PASO_FISICA, creaFisica, creaGestorColisiones } from '../fisica/fisica.js';
import { creaCoche } from '../vehiculo/coche.js';
import { cargaGeoJSON } from '../visor/lineas.js';

const MAX_PASOS_POR_FOTOGRAMA = 4;
const DISTANCIAS_COCHES = {
  detalle: CALIDAD.distanciaCochesDetalle, lejos: CALIDAD.distanciaCochesLejos, max: CALIDAD.distanciaCochesMax,
};

export async function iniciaJuego({ renderer, escena, camara, ui, ciclo }) {
  ui.estado.textContent = 'Cargando Cabanillas…';
  creaReflejos(renderer, escena);
  const [mundo, geoCalles, modelosCoches, aparcados, modelosArboles, datosArboles, vegetacion, geoPoi, geoCaminos, datosMuros, personas, datosElementos] = await Promise.all([
    cargaMundo(renderer, ESCENA, {
      alProgresar: (f) => { ui.estado.textContent = `Cargando escena… ${Math.round(f * 100)} %`; },
    }),
    cargaGeoJSON(ESCENA.rutaCalles),
    cargaModelosCoches(ESCENA.rutaCoches),
    cargaGeoJSON(ESCENA.rutaCochesAparcados),
    cargaModelosArboles(ESCENA.rutaModelosArboles),
    cargaGeoJSON(ESCENA.rutaArboles),
    cargaVegetacion(ESCENA.rutaVegetacion),
    cargaGeoJSON(ESCENA.rutaPoi).catch(() => null),
    cargaGeoJSON(ESCENA.rutaCaminos).catch(() => null),
    cargaMuros(ESCENA.rutaMuros),
    cargaPersonas(ESCENA.rutaPersonas),
    cargaElementos(ESCENA.rutaElementos),
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
  const muros = creaMuros(datosMuros, mundo.terreno, fisica);
  escena.add(muros.raiz);
  const elementos = creaElementos(datosElementos, {
    terreno: mundo.terreno, fisica, calles: geoCalles, edificios: mundo.geoEdificios, muros: datosMuros,
  });
  escena.add(elementos.raiz);
  const canal = creaCanal(await cargaGeoJSON(ESCENA.rutaAgua).catch(() => null), mundo.terreno);
  escena.add(canal);
  hierba.ponExclusion(canal.userData.bajoAgua);
  const colisiones = creaGestorColisiones(fisica, { radio: CALIDAD.radioColisiones });
  const nodos = nodosDeCalles(geoCalles);
  const coche = creaCoche(fisica, escena, modelosCoches[VEHICULO.modelo]);
  const entrada = creaEntrada(ui.tactil);
  const camaraCoche = creaCamaraCoche(camara, fisica, mundo.terreno, coche);
  const trafico = creaTrafico({
    escena, fisica, modelos: modelosCoches, grafo: creaGrafoCalles(geoCalles), terreno: mundo.terreno,
    excluirModelo: VEHICULO.modelo,
  });
  const peaton = creaPeaton(fisica, mundo.terreno);
  const peatones = creaPeatones({
    calles: geoCalles, caminos: geoCaminos, edificios: mundo.geoEdificios, muros: datosMuros, terreno: mundo.terreno, personas,
  });
  escena.add(peatones.raiz);
  const infoCoche = modelosCoches[VEHICULO.modelo].info;
  let obstaculosPeatones = [];
  const luces = creaLuces({
    escena, cocheJugador: coche.modelo.grupo, infoJugador: modelosCoches[VEHICULO.modelo].info, agentes: trafico.agentes,
  });
  const botonBajar = document.querySelector('[data-pulsar="bajar"]');
  let aPie = false;
  let avisoHasta = 0;
  let aviso = '';
  const PARADO = { acelerador: 0, freno: 0, direccion: 0, frenoMano: true, analogica: false };
  const avisa = (texto, segundos = 2.5) => { aviso = texto; avisoHasta = performance.now() + segundos * 1000; };

  // Bajarse: con el coche casi parado, por el lado del conductor (si está ocupado, por el otro,
  // por detrás o por delante)
  function bajarse() {
    const e = coche.estado();
    if (Math.abs(e.velocidadKmh) > PEATON.velocidadBajarKmh) { avisa('Para el coche para bajarte'); return; }
    const f = e.adelante.clone().setY(0).normalize();
    const izquierda = new THREE.Vector3(f.z, 0, -f.x);
    const { largo, ancho } = modelosCoches[VEHICULO.modelo].info;
    const huecos = [
      izquierda.clone().multiplyScalar(ancho / 2 + 0.7), izquierda.clone().multiplyScalar(-(ancho / 2 + 0.7)),
      f.clone().multiplyScalar(-(largo / 2 + 0.8)), f.clone().multiplyScalar(largo / 2 + 0.8),
    ];
    for (const h of huecos) {
      const x = e.posicion.x + h.x;
      const z = e.posicion.z + h.z;
      if (!peaton.libre(x, z)) continue;
      peaton.activa(x, z, Math.atan2(-f.x, -f.z));
      aPie = true;
      botonBajar.textContent = '🚗';
      camara.fov = PEATON.fov;
      camara.updateProjectionMatrix();
      avisa('A pie · E (o 🚗) cerca del coche para subir', 3);
      return;
    }
    avisa('No hay sitio para bajarse aquí');
  }

  function subirse() {
    const p = peaton.estado().posicion;
    const c = coche.cuerpo.translation();
    if (Math.hypot(p.x - c.x, p.z - c.z) > PEATON.distanciaSubirM + 1.2) { avisa('Acércate al coche para subir'); return; }
    peaton.desactiva();
    aPie = false;
    botonBajar.textContent = '🚶';
    document.exitPointerLock?.();
  }

  // Ir a un lugar (menú de pausa): el coche aparece en la calle más cercana, a lo largo de la
  // calle y en el sentido que más se acerca al sitio
  function irA(nombre) {
    const lugar = carteles.lugares.find((l) => l.nombre === nombre);
    if (!lugar) return;
    if (aPie) subirseYa();
    const n = nodoMasCercano(nodos, lugar.x, lugar.z, { excluirServicio: true });
    const haciaX = lugar.x - n.x;
    const haciaZ = lugar.z - n.z;
    const signo = n.dx * haciaX + n.dz * haciaZ >= 0 ? 1 : -1;
    colocaEn({ ...n, dx: n.dx * signo, dz: n.dz * signo });
    avisa(`${lugar.icono} ${lugar.nombre}`, 3);
  }
  function subirseYa() {
    peaton.desactiva();
    aPie = false;
    botonBajar.textContent = '🚶';
  }

  // Con ratón: clic sobre la escena para capturar el puntero y mirar alrededor andando
  renderer.domElement.addEventListener('click', (ev) => {
    if (aPie && !pausado && ev.pointerType !== 'touch' && document.pointerLockElement !== renderer.domElement) {
      renderer.domElement.requestPointerLock?.();
    }
  });

  // Salida: el nodo de calle más cercano al origen (centro del casco)
  function colocaEn(nodo) {
    const y = mundo.terreno.alturaEn(nodo.x, nodo.z) + VEHICULO.reinicio.alturaSobreSuelo;
    coche.recoloca(nodo.x, y, nodo.z, nodo.dx, nodo.dz);
    colisiones.fuerza({ x: nodo.x, z: nodo.z });
  }
  const salida = nodoMasCercano(nodos, 0, 0, { excluirServicio: true });
  colocaEn(salida);
  mundo.edificios.actualiza({ x: salida.x, z: salida.z }, { todo: true });
  const carteles = creaCarteles({ poi: geoPoi, calles: geoCalles, edificios: mundo.geoEdificios, terreno: mundo.terreno });
  escena.add(carteles.raiz);
  const hud = await creaHud(mundo, { lugares: carteles.lugares });
  ui.estado.textContent = '';

  let acumulado = 0;
  let tiempoVolcado = 0;
  let tiempoReparto = 0;
  let fotogramas = 0;
  let tiempoFps = 0;
  let fps = 0;
  let msFotograma = 0;
  let textoDepuracion = '';
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
      avanzaAgua(dt);
      hierba.actualiza(camara.position);
      tiempoReparto -= dt;
      if (tiempoReparto <= 0) {
        cochesAparcados.actualiza(camara.position, DISTANCIAS_COCHES);
        arboles.actualiza(camara.position, CALIDAD.distanciaArbolesDetalle);
        mundo.edificios.actualiza(camara.position);
        carteles.actualiza(camara.position);
        tiempoReparto = ESCENA.segundosRepartoCoches;
      }
      return;
    }
    const mandos = entrada.actualiza();
    const mirada = entrada.consumeMirada();
    if (entrada.consume('bajar')) {
      if (aPie) subirse(); else bajarse();
    }
    if (entrada.consume('reiniciar') && !aPie) recolocaCerca();
    if (entrada.consume('camara') && !aPie) camaraCoche.cambia();
    if (entrada.consume('hora') && ciclo) {
      ciclo.adelanta(1);
      avisa(`🕒 ${textoHora(ciclo.estado.hora)}`, 2);
    }

    // Lo que importa para colisiones y tráfico: el coche y, a pie, también el peatón
    const posCoche = coche.cuerpo.translation();
    const estadoPie = aPie ? peaton.estado() : null;
    const centro = aPie ? estadoPie.posicion : posCoche;
    colisiones.actualiza(centro, aPie ? { x: 0, z: 0 } : coche.cuerpo.linvel(), dt);
    const otros = [{ x: posCoche.x, z: posCoche.z, radio: 2.5 }];
    if (aPie) otros.push({ x: centro.x, z: centro.z, radio: 0.6 });
    otros.push(...obstaculosPeatones);
    trafico.actualiza(dt, { jugador: centro, camara, otros });
    acumulado += Math.min(dt, PASO_FISICA * MAX_PASOS_POR_FOTOGRAMA);
    while (acumulado >= PASO_FISICA) {
      coche.aplicaEntrada(aPie ? PARADO : mandos, PASO_FISICA);
      coche.paso(PASO_FISICA);
      if (aPie) peaton.paso(mandos, PASO_FISICA);
      fisica.mundo.step();
      acumulado -= PASO_FISICA;
    }
    coche.sincroniza();

    const e = coche.estado();
    const fCoche = e.adelante.clone().setY(0).normalize();
    peatones.actualiza(dt, {
      jugador: centro, camara, oscuridad: ciclo ? ciclo.estado.oscuridad : 0,
      coche: { x: e.posicion.x, z: e.posicion.z, fx: fCoche.x, fz: fCoche.z, velocidad: e.velocidadKmh / 3.6,
        largo: infoCoche.largo, ancho: infoCoche.ancho },
      aPie: aPie ? { x: centro.x, z: centro.z } : null,
    });
    obstaculosPeatones = peatones.obstaculos();
    const suelo = mundo.terreno.alturaEn(e.posicion.x, e.posicion.z);
    if (!aPie && e.posicion.y < suelo - VEHICULO.reinicio.caidaMaxima) recolocaCerca();
    tiempoVolcado = !aPie && e.volcado ? tiempoVolcado + dt : 0;

    if (aPie) {
      peaton.mira(mirada.dx, mirada.dy, mandos.giro, dt);
      peaton.colocaCamara(camara);
    } else {
      camaraCoche.actualiza(dt);
    }
    arboles.avanza(dt);
    hierba.avanza(dt);
    avanzaAgua(dt);
    hierba.actualiza(camara.position);
    tiempoReparto -= dt;
    if (tiempoReparto <= 0) {
      cochesAparcados.actualiza(camara.position, DISTANCIAS_COCHES);
      arboles.actualiza(camara.position, CALIDAD.distanciaArbolesDetalle);
      mundo.edificios.actualiza(camara.position);
      carteles.actualiza(camara.position);
      tiempoReparto = ESCENA.segundosRepartoCoches;
    }

    fotogramas++;
    tiempoFps += dt;
    if (tiempoFps >= 0.5) {
      fps = Math.round(fotogramas / tiempoFps);
      msFotograma = (tiempoFps / fotogramas) * 1000;
      fotogramas = 0;
      tiempoFps = 0;
      if (ui.mostrarFps) {
        const r = renderer.info.render;
        textoDepuracion = `${fps} FPS · ${msFotograma.toFixed(1)} ms · ${r.calls} llamadas · `
          + `${Math.round(r.triangles / 1000)} k triángulos · ${colisiones.activos}/${colisiones.total} colisiones · `
          + `calidad ${CALIDAD.nivel} · resolución ${Math.round((ui.proporcionPixeles?.() ?? 1) * 100)} %`;
      }
    }
    hud.actualiza(aPie ? peaton.estado() : e, dt, trafico.posiciones());
    luces.actualiza(ciclo ? ciclo.estado.oscuridad : 0);
    let texto = textoDepuracion;
    if (tiempoVolcado > VEHICULO.reinicio.segundosVolcado) texto = 'Coche volcado: pulsa R (o ↺) para recolocarlo';
    if (performance.now() < avisoHasta) texto = aviso;
    ui.estado.textContent = texto;
  }

  const api = { mundo, fisica, coche, entrada, camaraCoche, nodos, cochesAparcados, modelosCoches, arboles, hierba, hud, colisiones, trafico, peaton,
    get aPie() { return aPie; }, bajarse, subirse, irA, avisa, carteles, luces, ciclo, peatones, muros, elementos,
    lugares: carteles.lugares.map(({ nombre, icono }) => ({ nombre, icono })),
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
