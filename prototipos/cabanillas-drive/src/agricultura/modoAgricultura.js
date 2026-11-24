// Modo agricultura (PLAN_AGRICULTURA.md). Fase A3: el tractor y la COPE. El tractor espera aparcado
// en el patio de la COPE; al entrar en su aro (E o «Entrar») se abre el menú: coger el tractor (y
// el coche se queda aparcado en el patio) o, si ya se lleva, dejarlo en su sitio y volver al coche.
// Lo carga juego.js con import() la primera vez que hace falta (solo con el modo activo).
import { AGRICULTURA } from '../config/agricultura.js';
import { COLORES_TRACTOR, TRACTOR } from '../config/maquinaria.js';
import { creaMenuCope } from '../hud/menuCope.js';
import { creaMaquina } from './maquina.js';

const CLAVE_COLOR = 'cabdrive.agricultura.colorTractor';

function leeColor() {
  try {
    const i = Number.parseInt(localStorage.getItem(CLAVE_COLOR) ?? '', 10);
    return Number.isInteger(i) && i >= 0 && i < COLORES_TRACTOR.length ? i : 0;
  } catch { return 0; }
}

export async function creaModoAgricultura({ api, escena, fisica }) {
  const C = AGRICULTURA.cope;
  const terreno = api.mundo.terreno;
  let indiceColor = leeColor();
  const tractor = await creaMaquina(fisica, escena, { ...TRACTOR, color: COLORES_TRACTOR[indiceColor].color });
  const menu = creaMenuCope();

  // Deja un vehículo en un sitio del patio (x, z, rumbo en grados: 0 = norte, 90 = este)
  function colocaEn(vehiculo, [x, z, rumbo]) {
    const r = (rumbo * Math.PI) / 180;
    const y = terreno.alturaEn(x, z) + vehiculo.config.reinicio.alturaSobreSuelo * 0.5;
    vehiculo.recoloca(x, y, z, Math.sin(r), -Math.cos(r));
  }
  colocaEn(tractor, C.sitioTractor);
  api.aparcaVehiculo(tractor);

  function pinta(indice) {
    indiceColor = indice;
    try { localStorage.setItem(CLAVE_COLOR, String(indice)); } catch { /* sin almacenamiento */ }
    tractor.modelo.grupo.traverse((o) => {
      if (o.isMesh && o.material?.name === 'pintura') o.material.color.set(COLORES_TRACTOR[indice].color);
    });
  }

  function cogeTractor(indice) {
    if (indice !== indiceColor) pinta(indice);
    const coche = api.coche;
    colocaEn(coche, C.sitioCoche);           // el coche, aparcado a un lado del patio
    api.cambiaVehiculo(tractor);
    api.avisa('🚜 Llevas el tractor · vuelve a la COPE para dejarlo', 5);
  }
  function dejaTractor() {
    colocaEn(tractor, C.sitioTractor);
    api.cambiaVehiculo(api.cocheJugador);
    api.avisa('🚗 Tractor aparcado en la COPE', 4);
  }

  return {
    tractor,
    get llevaTractor() { return api.coche === tractor; },
    get menuAbierto() { return menu.visible; },
    // Llamado al entrar por el aro de la COPE
    async entra() {
      menu.abre({
        en: api.coche === tractor ? 'tractor' : 'coche',
        colores: COLORES_TRACTOR,
        colorElegido: indiceColor,
        acciones: { tractor: cogeTractor, coche: dejaTractor },
      });
    },
    cogeTractor: (indice = indiceColor) => cogeTractor(indice),
    dejaTractor,
  };
}
