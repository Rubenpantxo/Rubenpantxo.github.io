// Apariencia del personaje: valores por defecto, guardado en el navegador, azar y herencia.
// Una apariencia es un objeto pequeño (macros, deslizadores, piel, ojos, pelo, ropa y colores):
// el juego la vuelve a construir con modelo.js, así que no hace falta guardar mallas.
import { PERSONAJE } from '../config/personaje.js';

export function aparienciaPorDefecto() {
  return structuredClone(PERSONAJE.porDefecto);
}

// Completa una apariencia guardada con lo que le falte (versiones viejas del editor)
export function normaliza(a) {
  const d = aparienciaPorDefecto();
  if (!a || typeof a !== 'object') return d;
  const r = { ...d, ...a };
  for (const k of ['macro', 'piel', 'ojos', 'pelo', 'cejas', 'pestanas', 'ropa']) r[k] = { ...d[k], ...(a[k] ?? {}) };
  r.macro.origen = { ...d.macro.origen, ...(a.macro?.origen ?? {}) };
  r.detalle = { ...(a.detalle ?? {}) };
  r.colores = { ...(a.colores ?? {}) };
  return r;
}

export function cargaGuardada() {
  try {
    const t = localStorage.getItem(PERSONAJE.claveGuardado);
    return t ? normaliza(JSON.parse(t)) : null;
  } catch { return null; }
}

export function guarda(a) {
  try { localStorage.setItem(PERSONAJE.claveGuardado, JSON.stringify(a)); return true; } catch { return false; }
}

// Azar con semilla (para que «padres» y personajes al azar se puedan repetir)
export function azarCon(semilla) {
  let s = (semilla >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const gauss = (azar, sd) => {
  const u = Math.max(1e-9, azar()); const v = azar();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sd;
};
const limita = (x, a, b) => Math.min(b, Math.max(a, x));

// Cara al azar: cada deslizador de la cara con una variación pequeña y natural (normal, sd 0,22),
// sin pasarse en ninguno; el cuerpo, más contenido
export function caraAlAzar(motor, azar, sd = 0.22) {
  const detalle = {};
  const cara = new Set(PERSONAJE.gruposCara.flatMap((g) => g.categorias));
  for (const [id, s] of motor.deslizadores) {
    if (!PERSONAJE.nombres[id]) continue;
    const enCara = cara.has(s.grupo);
    // En el cuerpo, solo grosores y tono (los largos y altos dan proporciones raras)
    if (!enCara && (azar() < 0.6 || /height|length|scale-vert|trans-/.test(id))) continue;
    let v = gauss(azar, enCara ? sd : sd * 0.35);
    if (!s.neg) v = Math.abs(v) * 0.6;                // los de solo un sentido (formas de cabeza)
    if (Math.abs(v) > 0.02) detalle[id] = +limita(v, -0.9, 0.9).toFixed(3);
  }
  return detalle;
}

function eligeDe(lista, azar) { return lista[Math.floor(azar() * lista.length)]; }

export function personajeAlAzar(fabrica, semilla = Date.now()) {
  const azar = azarCon(semilla);
  const cat = fabrica.catalogo;
  const hombre = azar() < 0.5;
  const s = hombre ? 'h' : 'm';
  const vale = (p) => p.sexo === 'u' || p.sexo === s;
  const de = (hueco) => cat.prendas.filter((p) => p.hueco === hueco && vale(p));
  const origen = azar();
  const o = origen < 0.8 ? { europeo: 0.85 + azar() * 0.15, africano: azar() * 0.05, asiatico: azar() * 0.08 }
    : origen < 0.9 ? { europeo: azar() * 0.3, africano: 0.7 + azar() * 0.3, asiatico: 0 }
      : { europeo: azar() * 0.3, africano: 0, asiatico: 0.7 + azar() * 0.3 };
  const edad = Math.round(limita(18 + Math.abs(gauss(azar, 26)), 18, 85));
  const etapa = edad < 34 ? 'young' : edad < 58 ? 'middleage' : 'old';
  const raza = o.africano > 0.5 ? 'african' : o.asiatico > 0.5 ? 'asian' : 'caucasian';
  const piel = cat.pieles.find((p) => p.id === `${etapa}_${raza}_${hombre ? 'male' : 'female'}`) ?? cat.pieles[0];
  const conjunto = azar() < 0.35;
  const colores = {};
  const prendas = {
    conjunto: conjunto ? eligeDe(de('conjunto'), azar)?.id ?? null : null,
    arriba: conjunto ? null : eligeDe(de('arriba'), azar)?.id ?? null,
    abajo: conjunto ? null : eligeDe(de('abajo'), azar)?.id ?? null,
    calzado: eligeDe(de('calzado'), azar)?.id ?? null,
    sombrero: azar() < 0.08 ? eligeDe(de('sombrero'), azar)?.id ?? null : null,
  };
  for (const id of Object.values(prendas)) if (id && azar() < 0.6) colores[id] = eligeDe(PERSONAJE.coloresRopa, azar);
  const peloColor = edad > 60 && azar() < 0.6 ? '#d9d4cc' : eligeDe(PERSONAJE.coloresPelo.slice(0, 10), azar);
  return normaliza({
    macro: {
      sexo: hombre ? 1 : 0, edad, musculo: limita(0.5 + gauss(azar, 0.15), 0.1, 0.95),
      peso: limita(0.5 + gauss(azar, 0.17) + (edad - 30) / 200, 0.1, 0.95),
      altura: limita(0.5 + gauss(azar, 0.1), 0.3, 0.66), proporciones: limita(0.6 + gauss(azar, 0.12), 0.35, 0.95),
      pecho: limita(0.5 + gauss(azar, 0.18), 0.1, 0.9), firmeza: limita(0.55 - (edad - 30) / 140, 0.1, 0.9), origen: o,
    },
    detalle: caraAlAzar(fabrica.motor, azar),
    piel: { id: piel.id, tono: +limita(gauss(azar, 0.15), -0.4, 0.4).toFixed(2), rubor: azar() * 0.5, brillo: 0.35 + azar() * 0.3 },
    ojos: { iris: eligeDe(cat.iris, azar).id, tamanoIris: 0 },
    pelo: {
      id: azar() < (hombre && edad > 50 ? 0.25 : 0.03) ? null : eligeDe(de('pelo'), azar)?.id ?? null,
      color: peloColor, canas: edad > 45 ? limita((edad - 45) / 35 + gauss(azar, 0.15), 0, 1) : 0,
    },
    cejas: { id: eligeDe(de('cejas'), azar)?.id, color: null },
    pestanas: { id: 'eyelashes01' },
    ropa: prendas,
    colores,
  });
}

// Herencia: una cara a medio camino entre dos «padres» (cada uno, una cara al azar con su nombre)
export function caraDePadre(motor, nombre, esMadre) {
  let h = esMadre ? 77 : 13;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return caraAlAzar(motor, azarCon(h), 0.3);
}
export function mezclaHerencia(motor, madre, padre, parecido) {
  const a = caraDePadre(motor, madre, true);
  const b = caraDePadre(motor, padre, false);
  const r = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const v = (a[id] ?? 0) * (1 - parecido) + (b[id] ?? 0) * parecido;
    if (Math.abs(v) > 0.01) r[id] = +v.toFixed(3);
  }
  return r;
}
