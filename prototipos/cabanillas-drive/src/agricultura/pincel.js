// Pincel de las máscaras (PLAN_AGRICULTURA.md §5.2). Pinta en la parcela la franja que barre un apero
// de cierta anchura al ir de un punto a otro: cada píxel cuya distancia al segmento es menor que
// media anchura recibe la labor, con un borde suave. Es lo mismo que harán los aperos en A4–A5 (el
// tractor pasará su posición de cada fotograma); de momento lo usa el pincel de depuración.
// Solo se pinta dentro de la linde.
import { AGRICULTURA } from '../config/agricultura.js';

const PI = Math.PI;

// Ángulo de la pasada (0…π, la misma pasada en un sentido u otro deja los mismos surcos) → byte
const byteDireccion = (dx, dz) => {
  let a = Math.atan2(dz, dx);
  if (a < 0) a += PI;
  if (a >= PI) a -= PI;
  return Math.round((a / PI) * 255) & 255;
};

// Dirección de labor de la parcela (rumbo: 0 = norte, 90 = este) como vector en x, z (norte = −Z)
export function direccionLabor(info) {
  const r = ((info.labor_grados ?? 0) * PI) / 180;
  return [Math.sin(r), -Math.cos(r)];
}

// Efecto de cada labor en un píxel con peso w (0…1). l = índice en laboreo, c = en cultivo
const LABOR = {
  rastrojo(m, l, c, w) {                 // deshace todo: vuelve a la ortofoto
    const k = 1 - w;
    for (let i = 0; i < 3; i++) { m.laboreo[l + i] *= k; m.cultivo[c + i] *= k; }
    m.cultivo[c + 3] *= k;
    if (w > 0.5) m.cultivo[c + 1] = 0;
  },
  arar(m, l, c, w, dir) {
    m.laboreo[l] = Math.max(m.laboreo[l], w * 255);
    m.laboreo[l + 1] *= 1 - w;            // el arado deshace el gradeo
    m.laboreo[l + 2] *= 1 - w * 0.7;      // y entierra casi todo el abono
    m.cultivo[c + 2] *= 1 - w;            // y el rastrojo
    m.cultivo[c + 3] *= 1 - w;            // y las rodadas
    if (w > 0.5) { m.cultivo[c + 1] = 0; m.laboreo[l + 3] = dir; }
  },
  gradear(m, l, c, w, dir) {
    m.laboreo[l + 1] = Math.max(m.laboreo[l + 1], w * 255);
    m.cultivo[c + 2] *= 1 - w;
    m.cultivo[c + 3] *= 1 - w * 0.6;
    if (w > 0.5) { m.cultivo[c + 1] = 0; m.laboreo[l + 3] = dir; }
  },
  abonar(m, l, c, w) {
    m.laboreo[l + 2] = Math.max(m.laboreo[l + 2], w * 255);
  },
  sembrar(m, l, c, w, dir, dia) {
    if (w > 0.5) {
      m.cultivo[c + 1] = dia;
      m.cultivo[c + 2] = 0;
      m.laboreo[l + 3] = dir;
    }
  },
  regar(m, l, c, w) {
    m.cultivo[c] = Math.max(m.cultivo[c], w * 255);
  },
  cosechar(m, l, c, w, dir) {
    m.cultivo[c + 2] = Math.max(m.cultivo[c + 2], w * 255);
    if (w > 0.5) { m.cultivo[c + 1] = 0; m.laboreo[l + 3] = dir; }
  },
  rodar(m, l, c, w) {
    m.cultivo[c + 3] = Math.max(m.cultivo[c + 3], w * 255);
  },
};

// Pinta una franja recta de anchura «ancho» (m) de (xa, za) a (xb, zb). Devuelve los píxeles tocados.
function franja(parcela, labor, xa, za, xb, zb, ancho, opciones) {
  const { mpp, ox, oz, ancho: W, alto: H, interior } = parcela;
  const suave = Math.min(AGRICULTURA.pincel.bordeSuaveM, ancho * 0.15);
  const media = ancho / 2;
  const dx = xb - xa;
  const dz = zb - za;
  const l2 = dx * dx + dz * dz;
  let dir = opciones.direccion;
  if (dir == null) {
    if (l2 > 1e-6) dir = byteDireccion(dx, dz);
    else { const [ex, ez] = direccionLabor(parcela.info); dir = byteDireccion(ex, ez); }
  }
  const alcance = media + suave;
  const i0 = Math.max(0, Math.floor((Math.min(xa, xb) - alcance - ox) / mpp));
  const i1 = Math.min(W - 1, Math.ceil((Math.max(xa, xb) + alcance - ox) / mpp));
  const j0 = Math.max(0, Math.floor((Math.min(za, zb) - alcance - oz) / mpp));
  const j1 = Math.min(H - 1, Math.ceil((Math.max(za, zb) + alcance - oz) / mpp));
  if (i0 > i1 || j0 > j1) return 0;
  const efecto = LABOR[labor];
  const dia = opciones.dia ?? 1;
  const fuerza = opciones.fuerza ?? 1;      // p. ej. riego a medias
  let tocados = 0;
  for (let j = j0; j <= j1; j++) {
    const z = oz + (j + 0.5) * mpp;
    for (let i = i0; i <= i1; i++) {
      const k = j * W + i;
      if (!interior[k]) continue;
      const x = ox + (i + 0.5) * mpp;
      const t = l2 > 1e-6 ? Math.min(1, Math.max(0, ((x - xa) * dx + (z - za) * dz) / l2)) : 0;
      const d = Math.hypot(x - xa - t * dx, z - za - t * dz);
      if (d >= alcance) continue;
      const w = d <= media - suave ? 1 : (alcance - d) / (2 * suave);
      efecto(parcela, k * 4, k * 4, Math.min(1, w) * fuerza, dir, dia);
      tocados++;
    }
  }
  if (tocados) parcela.marcaCambio(i0, j0, i1, j1);
  return tocados;
}

// Labor de un apero de anchura «ancho» entre dos puntos. Las rodadas son dos huellas separadas
// por la vía del tractor. opciones: { direccion (byte), dia (día de siembra, 1…255) }
export function pinta(parcela, labor, xa, za, xb, zb, ancho, opciones = {}) {
  if (!LABOR[labor]) throw new Error(`Labor desconocida: ${labor}`);
  if (labor !== 'rodar') return franja(parcela, labor, xa, za, xb, zb, ancho, opciones);
  const P = AGRICULTURA.pincel;
  let dx = xb - xa;
  let dz = zb - za;
  let l = Math.hypot(dx, dz);
  if (l < 1e-3) { [dx, dz] = direccionLabor(parcela.info); l = 1; }
  const nx = -dz / l;
  const nz = dx / l;
  const via = Math.min(P.viaRodadasM, Math.max(ancho - P.anchoRodadaM, 0));
  let n = 0;
  for (const s of [-0.5, 0.5]) {
    n += franja(parcela, labor, xa + nx * via * s, za + nz * via * s, xb + nx * via * s, zb + nz * via * s,
      P.anchoRodadaM, opciones);
  }
  return n;
}

// ¿Está labrado (arado o gradeado) el punto? Para quitar la hierba de lo trabajado
export function labradoEn(parcela, x, z) {
  const i = Math.floor((x - parcela.ox) / parcela.mpp);
  const j = Math.floor((z - parcela.oz) / parcela.mpp);
  if (i < 0 || j < 0 || i >= parcela.ancho || j >= parcela.alto) return false;
  const k = (j * parcela.ancho + i) * 4;
  return parcela.laboreo[k] > 127 || parcela.laboreo[k + 1] > 127 || parcela.cultivo[k + 2] > 127;
}

// Deja la parcela sin trabajar
export function limpia(parcela) {
  parcela.laboreo.fill(0);
  parcela.cultivo.fill(0);
  parcela.marcaCambio(0, 0, parcela.ancho - 1, parcela.alto - 1);
}
