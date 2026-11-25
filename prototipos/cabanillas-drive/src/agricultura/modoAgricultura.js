// Modo agricultura (PLAN_AGRICULTURA.md). El tractor espera aparcado en el patio de la COPE con los
// aperos al lado; al entrar en su aro (E o «Entrar») se abre el menú: coger el tractor (y el coche se
// queda aparcado en el patio), enganchar o dejar un apero, o volver al coche. Con un apero, Q (o ⬇)
// lo baja y, dentro de una parcela, labra por donde pasa (labranza.js).
// Lo carga juego.js con import() la primera vez que hace falta (solo con el modo activo).
import { AGRICULTURA } from '../config/agricultura.js';
import { APEROS, COLORES_TRACTOR, TRACTOR } from '../config/maquinaria.js';
import { cargaParcelas } from '../datos/parcelas.js';
import { creaHudAgricultura } from '../hud/agricultura.js';
import { creaMenuCope } from '../hud/menuCope.js';
import { cargaApero } from './aperos.js';
import { creaEnganche } from './enganche.js';
import { creaLabranza } from './labranza.js';
import { creaMaquina } from './maquina.js';
import { creaRegistro } from './registro.js';
import { creaSonidoMotor } from './sonidoMotor.js';

const CLAVE_COLOR = 'cabdrive.agricultura.colorTractor';

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
  const enganche = creaEnganche(tractor, { terreno });
  const labranza = creaLabranza({ api, escena, camara, renderer, registro, tractor, enganche });
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
  for (const a of listaAperos) a.aparca(labranza.raiz, terreno, C.sitiosAperos[a.id]);

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
  function engancha(id, aviso = true) {
    if (enganche.apero?.id === id) return;
    dejaApero();
    const a = aperos[id];
    a.recoge();
    enganche.engancha(a);
    if (aviso) api.avisa(`${a.config.icono} ${a.config.nombre} enganchado · ${conTeclado ? 'Q' : '⬇'}: bajarlo en la parcela`, 6);
  }
  function alternaApero() {
    if (api.coche !== tractor || !enganche.apero) return;
    const bajado = enganche.alterna();
    if (bajado && !registro.parcelaEn(...xz(enganche.puntoTrabajo()))) api.avisa('⬇ Apero bajado · labra solo dentro de una parcela', 3);
  }
  const xz = (v) => [v.x, v.z];

  let avisoMarchaAtras = 0;
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
        sonido: enTractor ? Boolean(sonido?.activo) : null,
        acciones: { tractor: cogeTractor, coche: dejaTractor, engancha, desengancha: () => { if (dejaApero()) api.avisa('Apero dejado en el patio', 3); },
          sonido: () => Boolean(sonido?.alterna()) },
      });
    },
    // Cada paso de física (antes de avanzar el mundo)
    paso(dt) { labranza.paso(dt); },
    // Cada fotograma, después de mover los vehículos
    actualiza(dt, mandos) {
      if (api.entrada.consume('apero')) alternaApero();
      const r = labranza.actualiza(dt);
      const enTractor = api.coche === tractor;
      if (enTractor) {
        const e = tractor.estado();
        if (enganche.trabajando && e.velocidadKmh < -1 && performance.now() > avisoMarchaAtras) {
          avisoMarchaAtras = performance.now() + 6000;
          api.avisa(`⬆ Levanta el apero para dar marcha atrás (${conTeclado ? 'Q' : '⬆'})`, 3);
        }
        const esfuerzo = enganche.apero && enganche.subida < 0.5 ? Math.min(1, Math.abs(e.velocidadKmh) / 3) : 0;
        sonido?.actualiza(dt, { velocidadKmh: e.velocidadKmh, acelerador: mandos?.acelerador ?? 0, esfuerzo,
          distancia: camara.position.distanceTo(e.posicion) });
        hud.actualiza({ apero: enganche.apero, bajado: enganche.bajado, velocidadKmh: e.velocidadKmh,
          parcela: labranza.parcelaPisada, recuento: labranza.recuento, conTeclado });
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
  };
  return modo;
}
