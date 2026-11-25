// Modo agricultura (PLAN_AGRICULTURA.md). El tractor espera aparcado en el patio de la COPE con los
// aperos al lado; al entrar en su aro (E o «Entrar») se abre el menú: coger el tractor (y el coche se
// queda aparcado en el patio), enganchar o dejar un apero, o volver al coche. Con un apero, Q (o ⬇)
// lo baja y, dentro de una parcela, labra por donde pasa (labranza.js). Lo sembrado crece con el
// reloj agrícola (crecimiento.js, cultivo.js): un día de cultivo por hora de juego, y en la COPE se
// pueden pasar días. En las parcelas con acequia (riego.json, de tools/52_riego.py), junto a la
// tajadera de cada boquera G (o 💧) la abre o la cierra y el agua entra y avanza por el relieve (riego.js).
// La cosechadora (A8) espera en el patio: se coge en el menú; Q baja el cabezal y siega lo maduro, X
// saca el tubo para pasar el grano al remolque del tractor (cosechadora.js); en la COPE se descarga.
// Lo carga juego.js con import() la primera vez que hace falta (solo con el modo activo).
import { AGRICULTURA } from '../config/agricultura.js';
import * as THREE from 'three';
import { APEROS, COLORES_TRACTOR, SEMILLAS, TRACTOR } from '../config/maquinaria.js';
import { cargaParcelas } from '../datos/parcelas.js';
import { creaHudAgricultura } from '../hud/agricultura.js';
import { creaMenuCope } from '../hud/menuCope.js';
import { cargaApero } from './aperos.js';
import { creaEnganche } from './enganche.js';
import { creaLabranza } from './labranza.js';
import { creaMaquina } from './maquina.js';
import { creaRegistro } from './registro.js';
import { creaSonidoMotor } from './sonidoMotor.js';
import { creaReloj, edadDe, envejece, faseDe } from './crecimiento.js';
import { creaCultivo } from './cultivo.js';
import { CULTIVOS } from '../config/cultivos.js';
import { cargaDatosRiego, creaRiegoModo } from './riego.js';
import { creaCosechadora } from './cosechadora.js';
import { pinta as pintaLabor } from './pincel.js';

const CLAVE_COLOR = 'cabdrive.agricultura.colorTractor';
const CLAVE_SEMILLA = 'cabdrive.agricultura.semilla';

function leeColor() {
  try {
    const i = Number.parseInt(localStorage.getItem(CLAVE_COLOR) ?? '', 10);
    return Number.isInteger(i) && i >= 0 && i < COLORES_TRACTOR.length ? i : 0;
  } catch { return 0; }
}

export async function creaModoAgricultura({ api, escena, fisica, camara, renderer }) {
  const C = AGRICULTURA.cope;
  const terreno = api.mundo.terreno;
  let indiceColor = leeColor();
  const [tractor, datosParcelas, datosRiego, ...listaAperos] = await Promise.all([
    creaMaquina(fisica, escena, { ...TRACTOR, color: COLORES_TRACTOR[indiceColor].color }),
    cargaParcelas(AGRICULTURA.rutaParcelas),
    cargaDatosRiego(),
    ...Object.keys(APEROS).map((id) => cargaApero(id, { fisica })),
  ]);
  const registro = creaRegistro(datosParcelas);
  const aperos = Object.fromEntries(listaAperos.map((a) => [a.id, a]));
  const menu = creaMenuCope();
  const raiz = new THREE.Group();
  raiz.name = 'raizAgricultura';
  escena.add(raiz);
  const enganche = creaEnganche(tractor, { terreno, raiz });
  // Reloj agrícola (?dia=N para empezar en otro día)
  const diaPedido = Number.parseInt(new URLSearchParams(location.search).get('dia') ?? '', 10);
  const reloj = creaReloj(Number.isFinite(diaPedido) && diaPedido >= 0 ? { dia: diaPedido } : {});
  const labranza = creaLabranza({ api, escena, camara, renderer, registro, tractor, enganche, raiz, reloj });
  const cultivos = new Map();               // ref → cultivo (dosel y matas) de las parcelas sembradas
  const sol = escena.getObjectByName('sol');
  // Cada día, lo que lleva demasiado sin cosechar se queda maduro (solo hacia delante en el tiempo)
  reloj.alCambiarDia((dia, pasados) => { if (pasados > 0) for (const p of labranza.parcelas.values()) if (p.siembra) envejece(p, dia, pasados); });
  // Riego (A7): acequias y tajaderas; cada día el suelo se seca y lo que crece apunta el agua que tuvo
  const riego = creaRiegoModo({ datos: datosRiego, terreno, labranza, registro, raiz });
  labranza.ponRiego(riego);
  // Cosechadora (A8): en el patio; vacía su tolva en el remolque de grano (apero del tractor)
  const cosechadora = await creaCosechadora({ fisica, escena, terreno, registro, labranza, reloj,
    remolques: () => Object.values(aperos).filter((a) => a.config.grano) });
  const combinada = cosechadora.maquina;
  const granero = {};                       // kg entregados en la COPE por cultivo (se venderán en A9)
  reloj.alCambiarDia((dia, pasados) => riego.alCambiarDia(dia, pasados));
  function pasaDias(n) {
    riego.resuelve();          // el agua que queda se mete en el suelo y se cierran las tajaderas
    reloj.pasaDias(n);
    for (const p of labranza.parcelas.values()) p.sube(performance.now(), true);
    api.avisa(`⏩ Día ${reloj.dia} de cultivo`, 3);
  }
  // Lo que lleva la parcela donde está el tractor: cultivo, etapa y edad (para el panel)
  function cultivoEn(info, x, z) {
    const p = info ? labranza.parcelas.get(info.ref) : null;
    if (!p?.siembra) return null;
    const i = Math.floor((x - p.ox) / p.mpp);
    const j = Math.floor((z - p.oz) / p.mpp);
    const byte = i >= 0 && j >= 0 && i < p.ancho && j < p.alto ? p.cultivo[(j * p.ancho + i) * 4 + 1] : 0;
    const edad = byte ? edadDe(byte, reloj.dia) : reloj.dia - p.siembra.ultimoDia;
    const f = faseDe(p.siembra.cultivo, edad);
    return { nombre: CULTIVOS[p.siembra.cultivo].nombre, edad, ...f, aqui: Boolean(byte) };
  }
  // Humedad media del suelo de la parcela (lo que da la lluvia como poco), para el panel
  let cacheSuelo = { ref: null, t: 0, valor: null };
  function sueloEn(info) {
    const p = info ? labranza.parcelas.get(info.ref) : null;
    if (!p || !riego.modelo) return null;
    const ahora = performance.now();
    if (cacheSuelo.ref === p.ref && ahora - cacheSuelo.t < 500) return cacheSuelo.valor;
    let s = 0; let n = 0;
    const lluvia = riego.modelo.humedad_lluvia;
    for (let k = 0; k < p.interior.length; k++) if (p.interior[k]) { s += Math.max(p.cultivo[k * 4] / 255, lluvia); n++; }
    cacheSuelo = { ref: p.ref, t: ahora, valor: { humedad: n ? s / n : 0 } };
    return cacheSuelo.valor;
  }
  let semilla = 'trigo';
  try { const g = localStorage.getItem(CLAVE_SEMILLA); if (g && SEMILLAS[g]) semilla = g; } catch { /* sin almacenamiento */ }
  const hud = creaHudAgricultura({ tactil: document.getElementById('tactil') });
  let tajaderaCerca = null;
  let sonido = null;                         // se crea al coger el tractor (después de un toque o tecla)
  const conTeclado = !matchMedia('(pointer: coarse)').matches;

  // Deja un vehículo en un sitio del patio (x, z, rumbo en grados: 0 = norte, 90 = este)
  function colocaEn(vehiculo, [x, z, rumbo]) {
    const r = (rumbo * Math.PI) / 180;
    // El centro de la caja de colisión, por encima del suelo (si se mete en el terreno, salta y gira)
    const { alturaLibre, altoCaja } = vehiculo.config.chasis;
    const y = terreno.alturaEn(x, z) + alturaLibre + altoCaja / 2 + 0.12;
    vehiculo.recoloca(x, y, z, Math.sin(r), -Math.cos(r));
  }
  colocaEn(tractor, C.sitioTractor);
  api.aparcaVehiculo(tractor);
  colocaEn(combinada, C.sitioCosechadora);
  api.aparcaVehiculo(combinada);
  for (const a of listaAperos) a.aparca(raiz, terreno, C.sitiosAperos[a.id]);

  function pinta(indice) {
    indiceColor = indice;
    try { localStorage.setItem(CLAVE_COLOR, String(indice)); } catch { /* sin almacenamiento */ }
    tractor.modelo.grupo.traverse((o) => {
      if (o.isMesh && o.material?.name === 'pintura') o.material.color.set(COLORES_TRACTOR[indice].color);
    });
  }

  function cogeTractor(indice, idApero = enganche.apero?.id ?? null) {
    if (indice !== indiceColor) pinta(indice);
    if (idApero) engancha(idApero, false);
    else if (enganche.apero) dejaApero();
    const coche = api.coche;
    colocaEn(coche, C.sitioCoche);           // el coche, aparcado a un lado del patio
    api.cambiaVehiculo(tractor);
    sonido ??= creaSonidoMotor();
    api.avisa(enganche.apero
      ? `🚜 ${enganche.apero.config.icono} ${enganche.apero.config.nombre} · ${conTeclado ? 'Q' : '⬇'}: bajarlo en la parcela`
      : '🚜 Llevas el tractor · vuelve a la COPE para engancharle un apero o dejarlo', 6);
  }
  function cogeCosechadora() {
    const coche = api.coche;
    if (coche === tractor) { enganche.pon(false); colocaEn(tractor, C.sitioTractor); }
    else colocaEn(coche, C.sitioCoche);
    api.cambiaVehiculo(combinada);
    sonido ??= creaSonidoMotor();
    api.avisa(`🌾 Llevas la cosechadora · ${conTeclado ? 'Q' : '⬇'}: bajar el cabezal en el cereal maduro · ${conTeclado ? 'X' : '🌾'}: el tubo de descarga`, 7);
  }
  function dejaCosechadora() {
    cosechadora.ponCabezal(false);
    cosechadora.ponTubo(false);
    colocaEn(combinada, C.sitioCosechadora);
    api.cambiaVehiculo(api.cocheJugador);
    sonido?.para();
    api.avisa('🚗 Cosechadora aparcada en la COPE', 4);
  }
  // Descarga en la COPE (de momento se apunta: la venta llega en A9)
  const nombreGrano = (id) => (CULTIVOS[id]?.nombre ?? 'grano').toLowerCase();
  function entrega(kg, id) {
    if (kg <= 0) return;
    granero[id] = (granero[id] ?? 0) + kg;
    api.avisa(`🏭 ${Math.round(kg).toLocaleString('es-ES')} kg de ${nombreGrano(id)} entregados en la COPE`, 5);
  }
  const textoGranero = () => Object.entries(granero).map(([id, kg]) => `${Math.round(kg).toLocaleString('es-ES')} kg de ${nombreGrano(id)}`).join(' y ');
  function dejaTractor() {
    enganche.pon(false);
    colocaEn(tractor, C.sitioTractor);
    api.cambiaVehiculo(api.cocheJugador);
    sonido?.para();
    api.avisa('🚗 Tractor aparcado en la COPE', 4);
  }
  function dejaApero() {
    const viejo = enganche.desengancha();
    if (viejo) viejo.aparca(labranza.raiz, terreno, C.sitiosAperos[viejo.id]);
    return viejo;
  }
  // Llena la tolva del apero en la COPE (abono o la semilla elegida). De momento sin pagar (A9)
  function llenaTolva(a = enganche.apero) {
    if (!a?.config.tolva) return false;
    a.llena(a.config.tolva === 'abono' ? 'abono' : semilla);
    return true;
  }
  const nombreCarga = (a) => (a.contenido === 'abono' ? 'abono' : `semilla de ${SEMILLAS[a.contenido]?.nombre.toLowerCase() ?? '…'}`);
  function engancha(id, aviso = true) {
    if (enganche.apero?.id === id) return;
    dejaApero();
    const a = aperos[id];
    a.recoge();
    enganche.engancha(a);
    llenaTolva(a);
    const lleno = a.config.tolva ? ` · tolva llena: ${Math.round(a.carga)} kg de ${nombreCarga(a)}` : '';
    if (aviso && a.config.grano) api.avisa(`${a.config.icono} ${a.config.nombre} enganchado · déjalo junto a la cosechadora para que lo llene con su tubo`, 6);
    else if (aviso) api.avisa(`${a.config.icono} ${a.config.nombre} enganchado${lleno} · ${conTeclado ? 'Q' : '⬇'}: bajarlo en la parcela`, 6);
  }
  function alternaApero() {
    if (api.coche === combinada) {
      const bajado = cosechadora.alternaCabezal();
      if (bajado && !registro.parcelaEn(...xz(cosechadora.centroCorte()))) api.avisa('⬇ Cabezal bajado · siega el cereal maduro de una parcela', 3);
      return;
    }
    if (api.coche !== tractor || !enganche.apero) return;
    if (!enganche.apero.config.labor) { api.avisa(`${enganche.apero.config.icono} El remolque no se baja: lo llena la cosechadora con su tubo`, 4); return; }
    const bajado = enganche.alterna();
    if (bajado && !registro.parcelaEn(...xz(enganche.puntoTrabajo()))) api.avisa('⬇ Apero bajado · labra solo dentro de una parcela', 3);
  }
  const xz = (v) => [v.x, v.z];

  // Tajadera junto al vehículo que se lleva (coche o tractor): abrirla o cerrarla
  function alternaTajadera(t = tajaderaCerca) {
    if (!t) return null;
    const abierta = riego.alterna(t.ref, t.indice);
    const M = riego.modelo;
    api.avisa(abierta
      ? `💧 Tajadera ${t.nombre} abierta: el agua entra en la ${t.ref} (${M.caudal_boquera_ls} L/s)`
      : `💧 Tajadera ${t.nombre} cerrada`, 4);
    return abierta;
  }
  const posicionVehiculo = () => api.coche?.estado?.().posicion ?? null;
  function alternaTubo() {
    if (api.coche !== combinada) return;
    const fuera = cosechadora.alternaTubo();
    if (fuera && cosechadora.tolvaKg <= 0) api.avisa('🌾 Tubo fuera · la tolva está vacía', 3);
  }
  // De lo sembrado (lo que queda más lo ya segado), cuánto se ha cosechado
  function porcentajeCosechado(p) {
    if (!p) return null;
    const r = p.recuento();
    return r.cosechado + r.sembrado > 0 ? (r.cosechado / (r.cosechado + r.sembrado)) * 100 : null;
  }
  let avisoVerde = 0;
  let avisoLlena = 0;
  let avisoRemolque = 0;

  let avisoMarchaAtras = 0;
  let avisoTolva = 0;
  let avisoRastrojo = 0;
  const modo = {
    tractor, enganche, labranza, registro, aperos,
    get llevaTractor() { return api.coche === tractor; },
    get menuAbierto() { return menu.visible; },
    get sonido() { return sonido; },
    // Llamado al entrar por el aro de la COPE
    async entra() {
      const enTractor = api.coche === tractor;
      const enCosechadora = api.coche === combinada;
      const rem = enganche.apero?.config.grano ? enganche.apero : null;
      menu.abre({
        en: enTractor ? 'tractor' : enCosechadora ? 'cosechadora' : 'coche',
        cosecha: enCosechadora ? { kg: cosechadora.tolvaKg, capacidad: cosechadora.capacidadKg, nombre: nombreGrano(cosechadora.contenido) } : null,
        remolque: enTractor && rem ? { kg: rem.carga, capacidad: rem.capacidad, nombre: nombreGrano(rem.contenido) } : null,
        granero: { kg: Object.values(granero).reduce((a, b) => a + b, 0), texto: `Entregado en la COPE: ${textoGranero()} (se venderá más adelante)` },
        colores: COLORES_TRACTOR,
        colorElegido: indiceColor,
        aperos: listaAperos.map((a) => ({ id: a.id, nombre: a.config.nombre, detalle: a.config.detalle, icono: a.config.icono,
          enganchado: enganche.apero === a })),
        semillas: Object.entries(SEMILLAS).map(([id, x]) => ({ id, ...x })),
        semilla,
        tolva: enTractor && enganche.apero?.config.tolva ? { nombre: nombreCarga(enganche.apero), llenado: enganche.apero.llenado,
          kg: enganche.apero.carga, capacidad: enganche.apero.capacidad, esSemilla: enganche.apero.config.tolva === 'semilla' } : null,
        sonido: enTractor || enCosechadora ? Boolean(sonido?.activo) : null,
        reloj: { dia: reloj.dia, minutosParaManana: Math.ceil(reloj.segundosParaManana / 60), pasar: AGRICULTURA.reloj.pasarDias },
        acciones: { tractor: cogeTractor, coche: enCosechadora ? dejaCosechadora : dejaTractor, engancha, cosechadora: cogeCosechadora,
          vaciaTolva: () => entrega(cosechadora.vacia(), cosechadora.contenido),
          vaciaRemolque: () => { if (rem) { const kg = rem.carga; rem.carga = 0; rem.pintaCarga(); entrega(kg, rem.contenido); } }, desengancha: () => { if (dejaApero()) api.avisa('Apero dejado en el patio', 3); },
          sonido: () => Boolean(sonido?.alterna()),
          pasaDias,
          semilla: (id) => { semilla = id; try { localStorage.setItem(CLAVE_SEMILLA, id); } catch { /* sin almacenamiento */ } },
          llena: () => { if (llenaTolva()) api.avisa(`Tolva llena: ${Math.round(enganche.apero.carga)} kg de ${nombreCarga(enganche.apero)}`, 4); } },
      });
    },
    // Cada paso de física (antes de avanzar el mundo)
    paso(dt) { labranza.paso(dt); },
    // Cada fotograma, después de mover los vehículos
    actualiza(dt, mandos) {
      if (api.entrada.consume('apero')) alternaApero();
      if (api.entrada.consume('descargar')) alternaTubo();
      reloj.avanza(dt);
      const r = labranza.actualiza(dt);
      // Riego: la tajadera más cerca del vehículo y el agua
      const pv = posicionVehiculo();
      tajaderaCerca = pv && riego.hay ? riego.tajaderaCerca(pv.x, pv.z) : null;
      if (api.entrada.consume('tajadera')) alternaTajadera();
      riego.actualiza(dt);
      hud.riego(tajaderaCerca ? { ...tajaderaCerca, estado: riego.estado(tajaderaCerca.ref), conTeclado } : null);
      // Cultivos: dosel y matas de cada parcela sembrada
      for (const p of labranza.parcelas.values()) {
        if (!p.siembra) continue;
        let c = cultivos.get(p.ref);
        if (!c) {
          c = creaCultivo(p, { terreno, reloj, sol });
          raiz.add(c.raiz);
          cultivos.set(p.ref, c);
        }
        c.pon(p.siembra.cultivo);
        c.actualiza(dt, camara);
      }
      // Cosechadora: cabezal, siega, tubo y descarga
      const enCosechadora = api.coche === combinada;
      cosechadora.actualiza(dt, enCosechadora);
      const enTractor = api.coche === tractor;
      if (enCosechadora) {
        const e = combinada.estado();
        const ahora = performance.now();
        if (cosechadora.verdes && ahora > avisoVerde) {
          avisoVerde = ahora + 8000;
          const cc = cosechadora.centroCorte();
          const infoC = registro.parcelaEn(cc.x, cc.z);
          const c = cultivoEn(infoC, cc.x, cc.z);
          const madura = CULTIVOS[labranza.parcelas.get(infoC?.ref)?.siembra?.cultivo]?.madura;
          api.avisa(c && madura ? `🌾 El ${c.nombre.toLowerCase()} aún no está maduro (${c.etapa.toLowerCase()}): faltan ${Math.max(1, Math.ceil(madura - c.edad))} días` : '🌾 Aquí el cereal aún no está maduro', 5);
        }
        if (cosechadora.tolvaLlena && cosechadora.cabezalBajado && ahora > avisoLlena) {
          avisoLlena = ahora + 9000;
          api.avisa(`🌾 Tolva llena · ${conTeclado ? 'X' : '🌾'}: saca el tubo sobre el remolque, o descárgala en la COPE`, 5);
        }
        if (cosechadora.sinRemolque && ahora > avisoRemolque) {
          avisoRemolque = ahora + 7000;
          api.avisa('🛒 El tubo no cae sobre un remolque · arrima el remolque por la izquierda, bajo el tubo', 4);
        }
        sonido?.actualiza(dt, { velocidadKmh: e.velocidadKmh, acelerador: mandos?.acelerador ?? 0,
          esfuerzo: cosechadora.segando ? 1 : cosechadora.cabezalBajado ? 0.35 : 0, distancia: camara.position.distanceTo(e.posicion) });
        const info = registro.parcelaEn(e.posicion.x, e.posicion.z);
        const activaP = info ? labranza.parcelas.get(info.ref) : null;
        hud.cosechadora({
          bajado: cosechadora.cabezalBajado, velocidadKmh: e.velocidadKmh, conTeclado, tuboFuera: cosechadora.tuboFuera,
          tolva: { kg: cosechadora.tolvaKg, capacidad: cosechadora.capacidadKg, nombre: nombreGrano(cosechadora.contenido) },
          segando: cosechadora.segando, descargando: cosechadora.descargando, rendimiento: cosechadora.rendimiento,
          parcela: info, cosechado: porcentajeCosechado(activaP),
          cultivo: cultivoEn(info, e.posicion.x, e.posicion.z),
          dia: reloj.dia, minutosParaManana: Math.ceil(reloj.segundosParaManana / 60),
        });
      } else if (enTractor) {
        const e = tractor.estado();
        if (enganche.trabajando && e.velocidadKmh < -1 && performance.now() > avisoMarchaAtras) {
          avisoMarchaAtras = performance.now() + 6000;
          api.avisa(`⬆ Levanta el apero para dar marcha atrás (${conTeclado ? 'Q' : '⬆'})`, 3);
        }
        const ahora = performance.now();
        if (labranza.tolvaVacia && ahora > avisoTolva) {
          avisoTolva = ahora + 8000;
          api.avisa(`La tolva está vacía · vuelve a la COPE a llenarla (${nombreCarga(enganche.apero)})`, 5);
        }
        if (labranza.sinPreparar && ahora > avisoRastrojo) {
          avisoRastrojo = ahora + 12000;
          api.avisa('Siembras sobre rastrojo · mejor arar y pasar el cultivador antes', 4);
        }
        const ap = enganche.apero;
        const carga = ap && (ap.config.resistenciaN > 0 || enganche.tdf) ? 1 : 0;
        const esfuerzo = ap && enganche.subida < 0.5 ? carga * Math.min(1, Math.abs(e.velocidadKmh) / 3) : 0;
        sonido?.actualiza(dt, { velocidadKmh: e.velocidadKmh, acelerador: mandos?.acelerador ?? 0, esfuerzo,
          distancia: camara.position.distanceTo(e.posicion) });
        hud.actualiza({ apero: ap, bajado: enganche.bajado, velocidadKmh: e.velocidadKmh,
          parcela: labranza.parcelaPisada, recuento: labranza.recuento, conTeclado,
          dia: reloj.dia, minutosParaManana: Math.ceil(reloj.segundosParaManana / 60),
          cultivo: cultivoEn(labranza.parcelaPisada, e.posicion.x, e.posicion.z),
          suelo: sueloEn(labranza.parcelaPisada),
          riego: labranza.parcelaPisada ? riego.estado(labranza.parcelaPisada.ref) : null,
          tolva: ap?.config.tolva ? { nombre: nombreCarga(ap), llenado: ap.llenado, kg: ap.carga } : null });
      } else {
        sonido?.para();
        hud.actualiza(null);
      }
      return r;
    },
    pausa() { sonido?.para(); },
    cogeTractor: (indice = indiceColor, idApero) => cogeTractor(indice, idApero),
    cosechadora,
    cogeCosechadora,
    dejaCosechadora,
    granero,
    alternaTubo,
    dejaTractor,
    engancha,
    dejaApero,
    alternaApero,
    llenaTolva,
    reloj,
    cultivos,
    pasaDias,
    riego,
    alternaTajadera,
    // ?agricultura=riego: con el tractor junto a la primera tajadera, mirando a la parcela
    empiezaEnRiego() {
      const s = riego.sitios.values().next().value;
      if (!s) return false;
      const t = s.acequia.tajaderas[0];
      const info = registro.porRef(s.ref);
      cogeTractor(indiceColor, null);
      const [cx, cz] = info.centro;
      const dx = cx - t.x;
      const dz = cz - t.z;
      const l = Math.hypot(dx, dz) || 1;
      // Fuera de la parcela, por el lado de la acequia, a unos metros de la tajadera
      const x = t.x - (dx / l) * 6;
      const z = t.z - (dz / l) * 6;
      const rumbo = (Math.atan2(dx, -dz) * 180) / Math.PI;
      colocaEn(tractor, [x, z, rumbo]);
      return true;
    },
    // ?agricultura=cosecha: la 2-700 sembrada de trigo ya maduro (preparada y abonada), la cosechadora
    // dentro, en una punta, mirando a lo largo de las líneas, y el tractor con el remolque fuera, junto
    // a la entrada
    empiezaEnCosecha(ref = '2-700', cultivo = 'trigo') {
      const info = registro.porRef(ref);
      if (!info) return false;
      const p = labranza.activa(info);
      const edad = CULTIVOS[cultivo].madura + 3;
      const byte = ((((reloj.dia - edad) % 255) + 255) % 255) + 1;
      const r = ((info.labor_grados ?? 0) * Math.PI) / 180;
      const e = [Math.sin(r), -Math.cos(r)];
      const n = [-e[1], e[0]];
      const [cx, cz] = info.centro;
      for (let t = -80; t <= 80; t += 2.5) {
        const xa = cx - e[0] * 300 + n[0] * t; const za = cz - e[1] * 300 + n[1] * t;
        const xb = cx + e[0] * 300 + n[0] * t; const zb = cz + e[1] * 300 + n[1] * t;
        pintaLabor(p, 'gradear', xa, za, xb, zb, 3);
        pintaLabor(p, 'abonar', xa, za, xb, zb, 3);
        pintaLabor(p, 'sembrar', xa, za, xb, zb, 3, { dia: byte });
      }
      p.siembra = { cultivo, primerDia: reloj.dia - edad, ultimoDia: reloj.dia - edad };
      p.sube(performance.now(), true);
      // Por dónde entra en la parcela la línea del centro, a lo largo de las líneas de siembra
      const anillo = info.partes[0][0];
      const dentro = (x, z) => {
        let c = false;
        for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
          if ((anillo[i][1] > z) !== (anillo[j][1] > z)
            && x < ((anillo[j][0] - anillo[i][0]) * (z - anillo[i][1])) / (anillo[j][1] - anillo[i][1]) + anillo[i][0]) c = !c;
        }
        return c;
      };
      let min = 0;
      for (let sv = -300; sv <= 0; sv += 0.5) if (dentro(cx + e[0] * sv, cz + e[1] * sv)) { min = sv; break; }
      const rumbo = (Math.atan2(e[0], -e[1]) * 180) / Math.PI;
      // Tractor con el remolque fuera, junto a la entrada
      const ent = info.entrada ?? { x: cx, z: cz };
      const fx = ent.x - cx; const fz = ent.z - cz; const fl = Math.hypot(fx, fz) || 1;
      engancha('remolque', false);
      colocaEn(tractor, [ent.x + (fx / fl) * 7, ent.z + (fz / fl) * 7, rumbo]);
      cogeCosechadora();
      colocaEn(combinada, [cx + e[0] * (min + 5.5), cz + e[1] * (min + 5.5), rumbo]);
      return true;
    },
    get tajaderaCerca() { return tajaderaCerca; },
    get semilla() { return semilla; },
    set semilla(id) { if (SEMILLAS[id]) semilla = id; },
  };
  return modo;
}
