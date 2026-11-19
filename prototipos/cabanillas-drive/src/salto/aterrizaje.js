// Dónde acaba el salto: el personaje a pie en un sitio libre y su coche aparcado en la calle
// más cercana. Si cae dentro de un edificio (tejado), en el agua o encima de algo, se le lleva
// a la calle (PLAN_SALTO.md, duda 3: de momento no se aterriza en tejados).
import { SALTO } from '../config/salto.js';
import { TIPOS_CONDUCIBLES, lineasDe } from '../datos/calles.js';

// Tramos de las calles por las que puede ir el coche (sin las de servicio)
export function tramosDeCalles(geoCalles) {
  const tramos = [];
  for (const f of geoCalles.features) {
    const tipo = f.properties.tipo;
    if (!TIPOS_CONDUCIBLES.has(tipo) || tipo === 'service') continue;
    for (const linea of lineasDe(f.geometry)) {
      for (let i = 0; i + 1 < linea.length; i++) tramos.push([linea[i][0], linea[i][1], linea[i + 1][0], linea[i + 1][1]]);
    }
  }
  return tramos;
}

// Punto de calle más cercano a (x, z), con la dirección del tramo
export function puntoDeCalle(tramos, x, z) {
  let mejor = null;
  let d2Mejor = Infinity;
  for (const [x0, z0, x1, z1] of tramos) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const l2 = dx * dx + dz * dz;
    if (l2 < 1e-6) continue;
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / l2));
    const px = x0 + dx * t;
    const pz = z0 + dz * t;
    const d2 = (px - x) ** 2 + (pz - z) ** 2;
    if (d2 < d2Mejor) {
      d2Mejor = d2;
      const l = Math.sqrt(l2);
      mejor = { x: px, z: pz, dx: dx / l, dz: dz / l, distancia: 0 };
    }
  }
  if (mejor) mejor.distancia = Math.sqrt(d2Mejor);
  return mejor;
}

// Calle adonde desviar el planeo si el aterrizaje previsto («hasta») no sirve (tejado, agua…):
// la más cercana a ese punto entre las de varios puntos del camino desde «desde» ({x, y, z}),
// siempre que se llegue en línea recta bajando sin pasar por debajo de ningún tejado.
// techoEn(x, z): altura del tejado o null. Devuelve {x, z} o null si no hace falta desviarse.
export function calleDesvio(desde, hasta, { tramos, esValido, techoEn, sueloEn }) {
  if (esValido(hasta.x, hasta.z)) return null;
  const candidatos = [];
  for (const f of [1, 0.75, 0.5, 0.25, 0]) {
    const c = puntoDeCalle(tramos, desde.x + (hasta.x - desde.x) * f, desde.z + (hasta.z - desde.z) * f);
    if (c) candidatos.push(c);
  }
  if (!candidatos.length) return null;
  candidatos.sort((a, b) => Math.hypot(a.x - hasta.x, a.z - hasta.z) - Math.hypot(b.x - hasta.x, b.z - hasta.z));
  const libre = (c) => {
    const d = Math.hypot(c.x - desde.x, c.z - desde.z);
    const yFin = sueloEn(c.x, c.z);
    for (let i = 1, n = Math.ceil(d / 2); i <= n; i++) {
      const f = i / n;
      const techo = techoEn(desde.x + (c.x - desde.x) * f, desde.z + (c.z - desde.z) * f);
      if (techo !== null && techo > desde.y + (yFin - desde.y) * f - 1) return false;
    }
    return esValido(c.x, c.z);
  };
  const c = candidatos.find(libre) ?? candidatos[0];
  return { x: c.x, z: c.z };
}

// «toque»: donde ha tocado el suelo ({x, z}); «rumbo»: hacia dónde iba (guiñada).
// esValido(x, z): libre de edificios y coches y fuera del agua.
// Devuelve { persona: {x, z, guinada, movido}, coche: {x, z, dx, dz} }
export function eligeAterrizaje(toque, rumbo, { tramos, esValido }) {
  const A = SALTO.aterrizaje;
  const calle = puntoDeCalle(tramos, toque.x, toque.z);
  if (!calle) return { persona: { ...toque, guinada: rumbo, movido: false }, coche: null };
  // El coche, en el sentido de la calle que más se parece al rumbo que traía
  const signo = calle.dx * -Math.sin(rumbo) + calle.dz * -Math.cos(rumbo) >= 0 ? 1 : -1;
  const dx = calle.dx * signo;
  const dz = calle.dz * signo;
  let persona = { x: toque.x, z: toque.z, guinada: rumbo, movido: false };
  let coche = { x: calle.x, z: calle.z, dx, dz };
  const lejosDeCalle = calle.distancia > A.distanciaCocheM * 2;
  if (lejosDeCalle && esValido(toque.x, toque.z)) {
    // En el campo: el coche, a su lado, mirando hacia la calle más cercana (o de lado si no cabe)
    const ux = (calle.x - toque.x) / calle.distancia;
    const uz = (calle.z - toque.z) / calle.distancia;
    const d = A.distanciaCocheM * 0.85;
    for (const [ox, oz] of [[ux, uz], [-uz, ux], [uz, -ux], [-ux, -uz]]) {
      const x = toque.x + ox * d;
      const z = toque.z + oz * d;
      if (esValido(x, z)) return { persona, coche: { x, z, dx: ux, dz: uz } };
    }
  }
  if (!esValido(toque.x, toque.z)) {
    // A la calle, unos metros por detrás del coche, mirándolo
    persona = { x: calle.x - dx * A.distanciaCocheM, z: calle.z - dz * A.distanciaCocheM,
      guinada: Math.atan2(-dx, -dz), movido: true };
  } else if (calle.distancia < A.distanciaCocheM * 0.6) {
    // Ha caído en la calle misma: el coche, aparcado algo más adelante
    coche = { x: calle.x + dx * A.distanciaCocheM, z: calle.z + dz * A.distanciaCocheM, dx, dz };
  }
  return { persona, coche };
}

// Índice de huellas de edificios (Catastro) por casillas: altura del tejado en (x, z) o null.
// Las casas modeladas a mano no están (se quitan del Catastro); esas las detecta la colisión.
export function creaIndiceTejados(geoEdificios, casillaM = 25) {
  const casillas = new Map();
  const clave = (i, j) => `${i},${j}`;
  for (const f of geoEdificios.features) {
    if (f.geometry?.type !== 'Polygon') continue;
    const anillo = f.geometry.coordinates[0];
    let x0 = Infinity; let z0 = Infinity; let x1 = -Infinity; let z1 = -Infinity;
    for (const [x, z] of anillo) {
      x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z);
    }
    const p = f.properties;
    const edificio = { anillo, techo: (p.base_y ?? 0) + (p.height ?? 0) };
    for (let i = Math.floor(x0 / casillaM); i <= Math.floor(x1 / casillaM); i++) {
      for (let j = Math.floor(z0 / casillaM); j <= Math.floor(z1 / casillaM); j++) {
        const k = clave(i, j);
        if (!casillas.has(k)) casillas.set(k, []);
        casillas.get(k).push(edificio);
      }
    }
  }
  return {
    techoEn(x, z) {
      for (const e of casillas.get(clave(Math.floor(x / casillaM), Math.floor(z / casillaM))) ?? []) {
        let dentro = false;
        const a = e.anillo;
        for (let i = 0, k = a.length - 1; i < a.length; k = i++) {
          const [xi, zi] = a[i];
          const [xk, zk] = a[k];
          if ((zi > z) !== (zk > z) && x < ((xk - xi) * (z - zi)) / (zk - zi) + xi) dentro = !dentro;
        }
        if (dentro) return e.techo;
      }
      return null;
    },
  };
}
