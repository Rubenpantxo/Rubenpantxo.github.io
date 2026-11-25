// Modo agricultura (PLAN_AGRICULTURA.md). El tractor espera aparcado en el patio de la COPE con los
// aperos al lado; al entrar en su aro (E o «Entrar») se abre el menú: coger el tractor (y el coche se
// queda aparcado en el patio), enganchar o dejar un apero, o volver al coche. Con un apero, Q (o ⬇)
// lo baja y, dentro de una parcela, labra por donde pasa (labranza.js). Lo sembrado crece con el
// reloj agrícola (crecimiento.js, cultivo.js): un día de cultivo por hora de juego, y en la COPE se
// pueden pasar días.
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
  const [tractor, datosParcelas, ...listaAperos] = await Promise.all([
    creaMaquina(fisica, escena, { ...TRACTOR, color: COLORES_TRACTOR[indiceColor].color }),
    cargaParcelas(AGRICULTURA.rutaParcelas),
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
  function pasaDias(n) {
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
  let semilla = 'trigo';
  try { const g = localStorage.getItem(CLAVE_SEMILLA); if (g && SEMILLAS[g]) semilla = g; } catch { /* sin almacenamiento */ }
  const hud = creaHudAgricultura({ tactil: document.getElementById('tactil') });
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
    if (aviso) api.avisa(`${a.config.icono} ${a.config.nombre} enganchado${lleno} · ${conTeclado ? 'Q' : '⬇'}: bajarlo en la parcela`, 6);
  }
  function alternaApero() {
    if (api.coche !== tractor || !enganche.apero) return;
    const bajado = enganche.alterna();
    if (bajado && !registro.parcelaEn(...xz(enganche.puntoTrabajo()))) api.avisa('⬇ Apero bajado · labra solo dentro de una parcela', 3);
  }
  const xz = (v) => [v.x, v.z];

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
      menu.abre({
        en: enTractor ? 'tractor' : 'coche',
        colores: COLORES_TRACTOR,
        colorElegido: indiceColor,
        aperos: listaAperos.map((a) => ({ id: a.id, nombre: a.config.nombre, detalle: a.config.detalle, icono: a.config.icono,
          enganchado: enganche.apero === a })),
        semillas: Object.entries(SEMILLAS).map(([id, x]) => ({ id, ...x })),
        semilla,
        tolva: enTractor && enganche.apero?.config.tolva ? { nombre: nombreCarga(enganche.apero), llenado: enganche.apero.llenado,
          kg: enganche.apero.carga, capacidad: enganche.apero.capacidad, esSemilla: enganche.apero.config.tolva === 'semilla' } : null,
        sonido: enTractor ? Boolean(sonido?.activo) : null,
        reloj: { dia: reloj.dia, minutosParaManana: Math.ceil(reloj.segundosParaManana / 60), pasar: AGRICULTURA.reloj.pasarDias },
        acciones: { tractor: cogeTractor, coche: dejaTractor, engancha, desengancha: () => { if (dejaApero()) api.avisa('Apero dejado en el patio', 3); },
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
      reloj.avanza(dt);
      const r = labranza.actualiza(dt);
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
      const enTractor = api.coche === tractor;
      if (enTractor) {
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
          tolva: ap?.config.tolva ? { nombre: nombreCarga(ap), llenado: ap.llenado, kg: ap.carga } : null });
      } else {
        sonido?.para();
        hud.actualiza(null);
      }
      return r;
    },
    pausa() { sonido?.para(); },
    cogeTractor: (indice = indiceColor, idApero) => cogeTractor(indice, idApero),
    dejaTractor,
    engancha,
    dejaApero,
    alternaApero,
    llenaTolva,
    reloj,
    cultivos,
    pasaDias,
    get semilla() { return semilla; },
    set semilla(id) { if (SEMILLAS[id]) semilla = id; },
  };
  return modo;
}
