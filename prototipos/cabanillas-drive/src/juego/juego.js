// Conducir por Cabanillas. Física a paso fijo (1/60 s) y render a lo que dé la pantalla.
// En pausa (o en la pantalla de inicio) la física se detiene y la cámara gira despacio alrededor del coche.
import * as THREE from 'three';
import { CALIDAD } from '../config/calidad.js';
import { ESCENA } from '../config/escena.js';
import { VEHICULO } from '../config/vehiculo.js';
import { CAMARA } from '../config/camara.js';
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
import { cargaMarcas, creaMarcas } from '../escena/marcas.js';
import { cargaFarolas, creaFarolas } from '../escena/farolas.js';
import { creaSingulares, sinArbolesSustituidos, sinMurosSustituidos } from '../escena/singulares.js';
import { creaCasas } from '../escena/casas.js';
import { ENTRADA } from '../config/entradas.js';
import { creaEntradas } from './entradas.js';
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
import { creaSalto } from '../salto/salto.js';
import { cargaModelosSalto } from '../salto/modelos.js';
import { cargaHorizonte } from '../escena/horizonte.js';
import { creaIndiceTejados, eligeAterrizaje, tramosDeCalles } from '../salto/aterrizaje.js';

const MAX_PASOS_POR_FOTOGRAMA = 4;
const CAMARA_FOV_COCHE = CAMARA.persecucion.fov;
const DISTANCIAS_COCHES = {
  detalle: CALIDAD.distanciaCochesDetalle, lejos: CALIDAD.distanciaCochesLejos, max: CALIDAD.distanciaCochesMax,
};

export async function iniciaJuego({ renderer, escena, camara, ui, ciclo, render = null }) {
  ui.estado.textContent = 'Cargando Cabanillas…';
  creaReflejos(renderer, escena);
  const [mundo, geoCalles, modelosCoches, aparcados, modelosArboles, datosArboles, vegetacion, geoPoi, geoCaminos, murosLidar, personas, datosElementos, modelosSalto, horizonte] = await Promise.all([
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
    cargaModelosSalto(),                       // avión y mochila-paracaídas (nunca falla: null si no están)
    cargaHorizonte(ESCENA.rutaHorizonte),      // relieve y ortofoto de alrededor (null si no está)
  ]);
  const datosMuros = sinMurosSustituidos(murosLidar);
  escena.add(mundo.raiz);
  if (horizonte) escena.add(horizonte);
  const cochesAparcados = creaCochesAparcados(modelosCoches, aparcados, mundo.terreno, { excluir: [VEHICULO.modelo] });
  escena.add(cochesAparcados.raiz);
  const arboles = creaArboles(renderer, modelosArboles, sinArbolesSustituidos(datosArboles), mundo.terreno, { entorno: escena });
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
  const marcas = creaMarcas(await cargaMarcas(ESCENA.rutaMarcas), mundo.terreno,
    { mallasTerreno: mundo.mallasTerreno, fisica });
  escena.add(marcas.raiz);
  escena.add(creaSingulares(mundo.terreno, fisica));
  const casas = creaCasas(mundo.terreno, fisica);
  escena.add(casas);
  const farolas = creaFarolas(await cargaFarolas(ESCENA.rutaFarolas), { terreno: mundo.terreno, fisica, luces: CALIDAD.lucesFarolas });
  escena.add(farolas.raiz);
  const colisiones = creaGestorColisiones(fisica, { radio: CALIDAD.radioColisiones });
  const nodos = nodosDeCalles(geoCalles);
  // Vehículo que conduce el jugador: el coche, o el tractor del modo agricultura (cambiaVehiculo).
  // El que no se conduce se queda aparcado donde se dejó (sigue en la física, frenado)
  let coche = creaCoche(fisica, escena, modelosCoches[VEHICULO.modelo]);
  const cocheJugador = coche;
  const vehiculosAparcados = new Set();
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
  let obstaculosPeatones = [];
  const luces = creaLuces({
    escena, cocheJugador: coche.modelo.grupo, infoJugador: modelosCoches[VEHICULO.modelo].info, agentes: trafico.agentes,
  });
  const botonBajar = document.querySelector('[data-pulsar="bajar"]');
  let aPie = false;
  // Modo fiestas (PLAN_FIESTAS.md): su código se descarga la primera vez que se entra
  let fiestas = null;
  let cambiandoFiestas = false;
  const enFiestas = () => Boolean(fiestas?.activo);
  // Salto en paracaídas al empezar (PLAN_SALTO.md), con ?salto
  let salto = null;
  const enSalto = () => Boolean(salto?.activo);
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
    const { largo, ancho } = coche.info;
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
      avisa('A pie · E (o 🚗) junto a un vehículo para subir', 3);
      return;
    }
    avisa('No hay sitio para bajarse aquí');
  }

  // Modo agricultura (PLAN_AGRICULTURA.md): su código se descarga la primera vez que se entra en
  // la COPE (solo existe con ?agricultura mientras no esté publicado)
  let agricultura = null;
  let cargandoAgricultura = null;
  function cargaAgricultura() {
    cargandoAgricultura ??= import('../agricultura/modoAgricultura.js')
      .then(({ creaModoAgricultura }) => creaModoAgricultura({ api, escena, fisica, camara, renderer }))
      .then((m) => { agricultura = m; return m; });
    return cargandoAgricultura;
  }
  async function entraAgricultura(e) {
    await cargaAgricultura();
    await agricultura.entra(e);
  }
  // Un vehículo que no se conduce: queda en la física, frenado, donde se dejó
  function aparcaVehiculo(v) {
    if (v && v !== coche) vehiculosAparcados.add(v);
  }
  // Cambia el vehículo que se conduce (coche ↔ tractor). El otro se queda aparcado
  function cambiaVehiculo(nuevo) {
    if (!nuevo || nuevo === coche) return;
    vehiculosAparcados.delete(nuevo);
    vehiculosAparcados.add(coche);
    coche = nuevo;
    camaraCoche.ponVehiculo(coche);
    tiempoVolcado = 0;
    acumulado = 0;
  }

  // Entrar al modo fiestas: sin tráfico ni peatones, el festejo montado y el jugador a pie dentro
  async function entraFiestas(modo) {
    if (cambiandoFiestas) return false;
    if (enSalto()) omiteSalto();
    cambiandoFiestas = true;
    try {
      if (!fiestas) {
        const { creaModoFiestas } = await import('../fiestas/modoFiestas.js');
        fiestas = creaModoFiestas({ escena, terreno: mundo.terreno, fisica, personas, ciclo, farolas, peaton, camara, avisa,
          salir: () => saleFiestas() });
      }
      const { NOMBRES_MODO } = await import('../fiestas/modoFiestas.js');
      const entro = await fiestas.entra(modo, (salida) => {
        trafico.retira();
        trafico.raiz.visible = false;
        peatones.raiz.visible = false;
        obstaculosPeatones = [];
        peaton.activa(salida.x, salida.z, salida.guinada);
        colisiones.fuerza({ x: salida.x, z: salida.z });
        aPie = true;
        botonBajar.hidden = true;
        entrada.ponModo('fiestas');
        document.getElementById('hud').classList.add('fiestas');       // sin velocímetro
      });
      if (entro && modo !== 'menu') {
        avisa(matchMedia('(pointer: coarse)').matches
          ? `Fiestas · ${NOMBRES_MODO[modo]} · joystick a fondo: esprint · ☰: volver al pueblo`
          : `Fiestas · ${NOMBRES_MODO[modo]} · WASD y ratón · Mayús esprint · Q quiebro · E recorte · Espacio salto · F refugio · V cámara`, 9);
      }
      return entro;
    } finally {
      cambiandoFiestas = false;
    }
  }

  async function saleFiestas() {
    if (!enFiestas() || cambiandoFiestas) return false;
    cambiandoFiestas = true;
    try {
      return await fiestas.sale(() => {
        subirseYa();
        entrada.ponModo('pueblo');
        document.getElementById('hud').classList.remove('fiestas');
        document.exitPointerLock?.();
        trafico.raiz.visible = true;
        peatones.raiz.visible = true;
        botonBajar.hidden = false;
        camara.fov = CAMARA_FOV_COCHE;
        camara.updateProjectionMatrix();
        const c = coche.cuerpo.translation();
        colisiones.fuerza({ x: c.x, z: c.z });
      });
    } finally {
      cambiandoFiestas = false;
    }
  }

  // Distancia (m) de un punto a la planta de un vehículo (su rectángulo)
  function distanciaAVehiculo(v, p) {
    const e = v.estado();
    const dx = p.x - e.posicion.x;
    const dz = p.z - e.posicion.z;
    const f = e.adelante.clone().setY(0).normalize();
    const largo = Math.abs(dx * f.x + dz * f.z) - v.info.largo / 2;
    const lado = Math.abs(dx * -f.z + dz * f.x) - v.info.ancho / 2;
    return Math.hypot(Math.max(0, largo), Math.max(0, lado));
  }
  // Subirse al vehículo más cercano: el que se dejó o otro de los aparcados (el tractor, la cosechadora…)
  function subirse() {
    if (enFiestas()) return;
    const p = peaton.estado().posicion;
    let elegido = coche;
    let dMin = distanciaAVehiculo(coche, p);
    for (const v of vehiculosAparcados) {
      const d = distanciaAVehiculo(v, p);
      if (d < dMin) { dMin = d; elegido = v; }
    }
    if (dMin > PEATON.distanciaSubirM - 1) { avisa('Acércate a un vehículo para subir'); return; }
    if (elegido !== coche) cambiaVehiculo(elegido);
    peaton.desactiva();
    aPie = false;
    botonBajar.textContent = '🚶';
    document.exitPointerLock?.();
  }

  // Ir a un lugar (menú de pausa): el coche aparece en la calle más cercana, a lo largo de la
  // calle y en el sentido que más se acerca al sitio
  function irA(nombre) {
    const lugar = lugares.find((l) => l.nombre === nombre);
    if (!lugar) return;
    if (enFiestas()) { avisa('Estás en las fiestas: en la pausa, «Volver al pueblo»', 4); return; }
    llevaA(lugar.x, lugar.z, Boolean(lugar.entrada));
    avisa(`${lugar.icono} ${lugar.nombre}`, 3);
  }
  function subirseYa() {
    peaton.desactiva();
    aPie = false;
    botonBajar.textContent = '🚶';
  }

  // Con ratón: clic sobre la escena para capturar el puntero y mirar alrededor andando
  renderer.domElement.addEventListener('click', (ev) => {
    if ((aPie || enSalto()) && !pausado && ev.pointerType !== 'touch' && document.pointerLockElement !== renderer.domElement) {
      renderer.domElement.requestPointerLock?.();
    }
  });

  // Salida: el nodo de calle más cercano al origen (centro del casco)
  function colocaEn(nodo) {
    const y = mundo.terreno.alturaEn(nodo.x, nodo.z) + coche.config.reinicio.alturaSobreSuelo;
    coche.recoloca(nodo.x, y, nodo.z, nodo.dx, nodo.dz);
    colisiones.fuerza({ x: nodo.x, z: nodo.z });
  }
  const salida = nodoMasCercano(nodos, 0, 0, { excluirServicio: true });
  colocaEn(salida);
  mundo.edificios.actualiza({ x: salida.x, z: salida.z }, { todo: true });
  const carteles = creaCarteles({ poi: geoPoi, calles: geoCalles, edificios: mundo.geoEdificios, terreno: mundo.terreno });
  escena.add(carteles.raiz);
  // Puntos de entrada (F7): las fiestas en la plaza y en San Roque, otros juegos…
  const entradas = creaEntradas({ terreno: mundo.terreno });
  escena.add(entradas.raiz);
  const lugares = [...carteles.lugares, ...entradas.lugares];
  const hud = await creaHud(mundo, { lugares });
  const botonEntrar = document.querySelector('[data-pulsar="entrar"]');
  const tactil = matchMedia('(pointer: coarse)').matches;
  let entradaAqui = null;
  // La entrada en la que está el jugador (a pie, o en coche casi parado)
  function entradaCerca() {
    if (enFiestas()) return null;
    if (aPie) { const p = peaton.estado().posicion; return entradas.en(p.x, p.z); }
    const e = coche.estado();
    return Math.abs(e.velocidadKmh) <= ENTRADA.cocheMaxKmh ? entradas.en(e.posicion.x, e.posicion.z) : null;
  }
  function entraPor(e) {
    if (e.accion.fiestas) { entraFiestas(e.accion.fiestas); return; }
    if (e.accion.agricultura) { entraAgricultura(e); return; }
    if (e.accion.juego) {
      // Al volver (atrás en el navegador) se reaparece aquí
      const p = new URLSearchParams(location.search);
      p.set('aparece', e.id);
      p.delete('fiestas');
      history.replaceState(null, '', `${location.pathname}?${p}`);
      avisa(`${e.icono} ${e.nombre}…`, 3);
      location.href = e.accion.juego;
    }
  }
  // Llega a un sitio (de «Ir a…» o al volver de otro juego): en coche, en la calle más cercana
  // mirando hacia él. «encima»: en el sitio mismo (las entradas están en la calle o la plaza)
  function llevaA(x, z, encima = false) {
    if (enSalto()) omiteSalto();
    if (aPie) subirseYa();
    const n = nodoMasCercano(nodos, x, z, { excluirServicio: true });
    const signo = n.dx * (x - n.x) + n.dz * (z - n.z) >= 0 ? 1 : -1;
    colocaEn({ ...n, ...(encima ? { x, z } : {}), dx: n.dx * signo, dz: n.dz * signo });
  }
  function aparece(id) {
    const e = entradas.porId(id);
    if (!e?.en) return false;
    llevaA(e.en[0], e.en[1], true);
    avisa(`${e.icono} ${e.nombre}`, 3);
    return true;
  }
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
    const e = aPie ? peaton.estado() : coche.estado();
    centroOrbita.copy(e.posicion);
    const r = aPie ? 9 : 16;
    camara.position.set(centroOrbita.x + Math.sin(anguloOrbita) * r, centroOrbita.y + 6, centroOrbita.z + Math.cos(anguloOrbita) * r);
    camara.lookAt(centroOrbita.x, centroOrbita.y + 1.2, centroOrbita.z);
  }

  // Detalle cerca de la cámara (hierba, árboles 3D, coches, tejados del LiDAR). Durante el salto,
  // lo que diga el salto: nada bajo la cámara si va alta y las celdas del sitio de aterrizaje
  function repartoDetalle(dt) {
    const foco = enSalto() ? salto.focoDetalle() : camara.position;
    hierba.actualiza(foco);
    tiempoReparto -= dt;
    if (tiempoReparto <= 0) {
      cochesAparcados.actualiza(foco, DISTANCIAS_COCHES);
      arboles.actualiza(camara.position, CALIDAD.distanciaArbolesDetalle);
      mundo.edificios.actualiza(enSalto() ? salto.focoEdificios() : camara.position);
      carteles.actualiza(camara.position);
      tiempoReparto = ESCENA.segundosRepartoCoches;
    }
  }

  function cuentaFps(dt) {
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
  }

  // --- Salto en paracaídas (PLAN_SALTO.md)
  const indiceTejados = creaIndiceTejados(mundo.geoEdificios);
  let tramosCalles = null;
  // Lo que hay debajo: el terreno o, dentro de la huella de un edificio, su tejado
  const sueloSalto = (x, z) => Math.max(mundo.terreno.alturaEn(x, z), indiceTejados.techoEn(x, z) ?? -Infinity);
  function esSitioValido(x, z) {
    if (indiceTejados.techoEn(x, z) !== null) return false;
    const y = mundo.terreno.alturaEn(x, z);
    if (canal.userData.bajoAgua?.(x, z, y + 0.3)) return false;
    return peaton.libre(x, z);
  }
  const zonaTactil = document.getElementById('tactil');
  // Dónde está aparcado el coche (para «Mi coche» en el minimapa cuando vas a pie o saltando)
  function posicionCoche() {
    const t = coche.cuerpo.translation();
    return { x: t.x, z: t.z };
  }
  function empiezaSalto(semilla = Math.floor(Math.random() * 1e9)) {
    if (enFiestas() || enSalto()) return false;
    if (aPie) subirseYa();
    tramosCalles ??= tramosDeCalles(geoCalles);
    trafico.retira();
    trafico.raiz.visible = false;
    peatones.raiz.visible = false;
    obstaculosPeatones = [];
    botonBajar.hidden = true;
    entrada.ponModo('salto');
    document.getElementById('hud').classList.add('salto');      // M: sonido, no girar el minimapa
    salto = creaSalto({
      escena, camara, terreno: mundo.terreno, render, semilla, tactil, detalles: [casas.userData.ponDetalle], modelos: modelosSalto, personas,
      zona: { mitadAncho: mundo.rejilla.ancho / 2, mitadAlto: mundo.rejilla.alto / 2 },
      centro: { x: salida.x, z: salida.z },
      suelo: sueloSalto,
      avisa,
      alTocarSuelo(toque, rumbo) {
        const r = eligeAterrizaje(toque, rumbo, { tramos: tramosCalles, esValido: esSitioValido });
        // El coche no te sigue: se queda aparcado donde estaba y hay que ir a buscarlo (el
        // minimapa lo marca como «Mi coche»)
        peaton.activa(r.persona.x, r.persona.z, r.persona.guinada);
        colisiones.fuerza({ x: r.persona.x, z: r.persona.z });
        aPie = true;
        botonBajar.textContent = '🚗';
        if (r.persona.movido) avisa('Has caído en un tejado: bajas a la calle', 3);
        return { colocaDestino: (objeto) => peaton.colocaCamara(objeto), fov: PEATON.fov };
      },
      alTerminar(omitido) {
        entrada.ponModo('pueblo');
        document.getElementById('hud').classList.remove('salto');
        trafico.raiz.visible = true;
        peatones.raiz.visible = true;
        botonBajar.hidden = false;
        camara.fov = omitido ? CAMARA_FOV_COCHE : PEATON.fov;
        camara.updateProjectionMatrix();
        if (!omitido) avisa('Ve a buscar tu coche: está donde lo dejaste (🚗 en el mapa)', 7);
      },
    });
    if (import.meta.env.DEV) window.__salto = salto;
    return true;
  }

  // Saltarse el salto: se empieza en el coche, en la salida de siempre (como sin salto)
  function omiteSalto() {
    if (!salto?.omitible) return false;
    salto.omite();
    return true;
  }

  // Un fotograma del salto: sin tráfico ni peatones; el coche, quieto donde esté
  function actualizaSalto(dt, mandos, mirada) {
    if (entrada.consume('hora') && ciclo) {
      ciclo.adelanta(1);
      avisa(`🕒 ${textoHora(ciclo.estado.hora)}`, 2);
    }
    if (entrada.consume('sonido')) avisa(salto.sonido.alterna() ? '🔊 Sonido' : '🔇 Sin sonido', 2);
    salto.actualiza(dt, mandos, mirada, entrada.consume('paracaidas'));
    colisiones.actualiza(enSalto() ? salto.prevision : peaton.estado().posicion, { x: 0, z: 0 }, dt);
    acumulado += Math.min(dt, PASO_FISICA * MAX_PASOS_POR_FOTOGRAMA);
    while (acumulado >= PASO_FISICA) {
      coche.aplicaEntrada(PARADO, PASO_FISICA);
      coche.paso(PASO_FISICA);
      fisica.mundo.step();
      acumulado -= PASO_FISICA;
    }
    coche.sincroniza();
    arboles.avanza(dt);
    hierba.avanza(dt);
    avanzaAgua(dt);
    entradas.mostrar(true);
    entradas.actualiza(dt);
    repartoDetalle(dt);
    cuentaFps(dt);
    hud.actualiza({ ...(enSalto() ? salto.estadoHud() : peaton.estado()), miCoche: posicionCoche() }, dt, []);
    luces.actualiza(ciclo ? ciclo.estado.oscuridad : 0);
    farolas.actualiza(ciclo ? ciclo.estado.oscuridad : 0, camara, dt);
    let texto = enSalto() ? `${salto.texto()}${textoDepuracion ? ` · ${textoDepuracion}` : ''}` : textoDepuracion;
    if (performance.now() < avisoHasta) texto = aviso;
    ui.estado.textContent = texto;
  }

  function actualiza(dt) {
    if (pausado) {
      if (enSalto()) salto.colocaCamara(0);
      else orbita(dt);
      arboles.avanza(dt);
      hierba.avanza(dt);
      avanzaAgua(dt);
      repartoDetalle(dt);
      agricultura?.pausa();
      return;
    }
    const mandos = entrada.actualiza();
    const mirada = entrada.consumeMirada();
    if (enSalto()) { actualizaSalto(dt, mandos, mirada); return; }
    // Entradas: E (o «Entrar») dentro del aro. Se mira siempre, para no dejar la pulsación pendiente
    const quiereEntrar = entrada.consume('entrar');
    const aqui = entradaCerca();
    if (aqui !== entradaAqui) {
      entradaAqui = aqui;
      if (aqui) avisa(`${aqui.icono} ${aqui.nombre} · ${tactil ? 'toca «Entrar»' : 'E: entrar'}`, 5);
      if (botonEntrar) botonEntrar.hidden = !aqui;
    }
    if (aqui && quiereEntrar) {
      entrada.consume('bajar');               // E también es bajarse del coche: aquí manda entrar
      entraPor(aqui);
    }
    if (entrada.consume('bajar') && !enFiestas()) {
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
    const fiesta = enFiestas();
    if (fiesta) fiestas.atiende(entrada);
    if (!fiesta) trafico.actualiza(dt, { jugador: centro, camara, otros });
    acumulado += Math.min(dt, PASO_FISICA * MAX_PASOS_POR_FOTOGRAMA);
    while (acumulado >= PASO_FISICA) {
      coche.aplicaEntrada(aPie ? PARADO : mandos, PASO_FISICA);
      coche.paso(PASO_FISICA);
      for (const v of vehiculosAparcados) { v.aplicaEntrada(PARADO, PASO_FISICA); v.paso(PASO_FISICA); }
      agricultura?.paso(PASO_FISICA);
      if (fiesta) fiestas.paso(mandos, PASO_FISICA);
      else if (aPie) peaton.paso(mandos, PASO_FISICA);
      fisica.mundo.step();
      acumulado -= PASO_FISICA;
    }
    coche.sincroniza();
    for (const v of vehiculosAparcados) v.sincroniza();
    agricultura?.actualiza(dt, mandos);

    const e = coche.estado();
    const fCoche = e.adelante.clone().setY(0).normalize();
    if (fiesta) fiestas.actualiza(dt, camara);
    else peatones.actualiza(dt, {
      jugador: centro, camara, oscuridad: ciclo ? ciclo.estado.oscuridad : 0,
      coche: { x: e.posicion.x, z: e.posicion.z, fx: fCoche.x, fz: fCoche.z, velocidad: e.velocidadKmh / 3.6,
        largo: coche.info.largo, ancho: coche.info.ancho },
      aPie: aPie ? { x: centro.x, z: centro.z } : null,
    });
    if (!fiesta) obstaculosPeatones = peatones.obstaculos();
    const suelo = mundo.terreno.alturaEn(e.posicion.x, e.posicion.z);
    if (!aPie && e.posicion.y < suelo - coche.config.reinicio.caidaMaxima) recolocaCerca();
    tiempoVolcado = !aPie && e.volcado ? tiempoVolcado + dt : 0;

    if (fiesta) {
      fiestas.fotograma(dt, mirada, mandos);
    } else if (aPie) {
      peaton.mira(mirada.dx, mirada.dy, mandos.giro, dt);
      peaton.colocaCamara(camara);
    } else {
      camaraCoche.actualiza(dt);
    }
    arboles.avanza(dt);
    hierba.avanza(dt);
    avanzaAgua(dt);
    entradas.mostrar(!fiesta);
    entradas.actualiza(dt);
    // A pie, los mandos táctiles sin el freno de mano (no hay coche que frenar)
    zonaTactil?.classList.toggle('a-pie', aPie && !fiesta);
    repartoDetalle(dt);
    cuentaFps(dt);
    hud.actualiza(fiesta ? fiestas.estadoJugador() : aPie ? { ...peaton.estado(), miCoche: posicionCoche() } : e, dt, fiesta ? [] : trafico.posiciones());
    luces.actualiza(ciclo ? ciclo.estado.oscuridad : 0);
    farolas.actualiza(ciclo ? ciclo.estado.oscuridad : 0, camara, dt);
    let texto = textoDepuracion;
    if (tiempoVolcado > coche.config.reinicio.segundosVolcado) texto = 'Volcado: pulsa R (o ↺) para recolocarlo';
    if (performance.now() < avisoHasta) texto = aviso;
    ui.estado.textContent = texto;
  }

  const api = { get coche() { return coche; }, mundo, fisica, entrada, camaraCoche, nodos, cochesAparcados, modelosCoches, arboles, hierba, hud, colisiones, trafico, peaton,
    get aPie() { return aPie; }, bajarse, subirse, irA, avisa, entraFiestas, saleFiestas,
    get fiestas() { return fiestas; },
    get modoFiestas() { return enFiestas() ? fiestas.modo : null; }, carteles, luces, ciclo, peatones, muros, elementos, farolas,
    lugares: lugares.map(({ nombre, icono }) => ({ nombre, icono })),
    entradas, aparece, empiezaSalto, omiteSalto, cambiaVehiculo, aparcaVehiculo, cocheJugador, entraAgricultura, cargaAgricultura,
    get agricultura() { return agricultura; },
    // El personaje del editor (PLAN_PERSONAJE.md) hace de jugador en las fiestas y en el salto
    async ponJugador(apariencia) {
      if (!apariencia || !personas) return false;
      try {
        const { creaVarianteJugador } = await import('../personaje/jugador.js');
        personas.jugador = await creaVarianteJugador(apariencia, { renderer, sombras: CALIDAD.sombras, texturaMax: CALIDAD.texturaMax ?? 2048 });
        return true;
      } catch (error) {
        console.warn('[personaje] no se pudo preparar el jugador; se usa la persona por defecto', error);
        return false;
      }
    },
    get salto() { return salto; },
    get puedeOmitirSalto() { return Boolean(salto?.omitible); },
    get fps() { return fps; },
    get ultimoAviso() { return aviso; },     // para las pruebas (el aviso dura segundos y ellas van lentas)
    get pausado() { return pausado; },
    // Al volver de la pausa no se recupera el tiempo parado (la física no da un salto)
    ponPausa(valor) {
      pausado = valor;
      acumulado = 0;
      hud.mostrar(!valor);
      fiestas?.mostrarHud(!valor);
      salto?.ponPausa?.(valor);
    },
  };
  if (import.meta.env.DEV) {
    // Para las pruebas (tools/prueba_salto.mjs): avanza el salto sin dibujar, a 30 pasos por
    // segundo, con unos mandos fijos (el navegador sin ventana va a menos de 2 FPS)
    api.simulaSalto = (segundos, mandos = {}, pulsaParacaidas = false) => {
      const m = { ...entrada.actualiza(), ...mandos };
      let pulsa = pulsaParacaidas || entrada.consume('paracaidas');
      for (let t = 0; t < segundos && enSalto(); t += 1 / 30) {
        salto.actualiza(1 / 30, m, { dx: 0, dy: 0 }, pulsa);
        pulsa = false;
        colisiones.actualiza(enSalto() ? salto.prevision : peaton.estado().posicion, { x: 0, z: 0 }, 1 / 30);
        fisica.mundo.step();
      }
      return salto.fase;
    };
    api.esSitioValido = esSitioValido;
  }
  if (import.meta.env.DEV) window.__juego = Object.assign(api, { THREE, renderer, camara, escena, colocaEn });
  return { actualiza, api };
}
