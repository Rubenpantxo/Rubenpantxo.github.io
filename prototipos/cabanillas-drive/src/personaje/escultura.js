// Escultura directa: pinchar en el cuerpo y arrastrar para darle forma, sin buscar deslizadores.
// Al pinchar se buscan los deslizadores que mueven ese punto (de las categorías de la pestaña
// abierta); al arrastrar, se calcula cuánto mueve cada uno el punto en la pantalla (su jacobiano
// 2 × m) y se resuelve el cambio mínimo de deslizadores que lleva el punto bajo el dedo:
//   Δx = Jᵀ (J Jᵀ + λI)⁻¹ Δratón
// Así el punto sigue al ratón y cada deslizador se mueve solo lo que le toca.
import * as THREE from 'three';
import { PERSONAJE } from '../config/personaje.js';

// Busca el vértice v en un target disperso (vértices ordenados): delta en metros o null
function deltaEn(t, v, out) {
  if (!t) return null;
  const vs = t.v;
  let a = 0; let b = vs.length - 1;
  while (a <= b) {
    const m = (a + b) >> 1;
    if (vs[m] === v) {
      out.set(t.d[m * 3] * t.e, t.d[m * 3 + 1] * t.e, t.d[m * 3 + 2] * t.e);
      return out;
    }
    if (vs[m] < v) a = m + 1; else b = m - 1;
  }
  return null;
}

export function creaEscultura({ motor, categorias }) {
  // Máximo de cada target (para saber si un punto es «suyo» o solo lo roza)
  const maximo = new Map();
  for (const [id] of motor.deslizadores) {
    const inf = motor.influencia(id);
    let m = 0;
    for (const t of [inf.pos, inf.neg]) {
      if (!t) continue;
      for (let i = 0; i < t.d.length; i += 3) m = Math.max(m, Math.hypot(t.d[i], t.d[i + 1], t.d[i + 2]) * t.e);
    }
    maximo.set(id, m);
  }

  const d = new THREE.Vector3();
  // Deslizadores que mueven el vértice v, por relevancia
  function candidatos(v, cats) {
    const lista = [];
    for (const [id, s] of motor.deslizadores) {
      if (!PERSONAJE.nombres[id] || (cats && !cats.has(s.grupo))) continue;
      const inf = motor.influencia(id);
      let m = 0;
      if (deltaEn(inf.pos, v, d)) m = Math.max(m, d.length());
      if (deltaEn(inf.neg, v, d)) m = Math.max(m, d.length());
      const rel = m / (maximo.get(id) || 1);
      // Mejor los rasgos locales (pocos vértices) que los que mueven media figura
      const n = Math.max(inf.pos?.v.length ?? 0, inf.neg?.v.length ?? 0);
      if (rel > 0.3 && m > 0.0008) lista.push({ id, rel, m, puntos: (rel * m) / Math.log(2 + n) });
    }
    return lista.sort((a, b) => b.puntos - a.puntos).slice(0, 8);
  }

  const pa = new THREE.Vector3();
  const pb = new THREE.Vector3();
  let sesion = null;

  return {
    // Empieza en el vértice v (índice de la malla base) con la apariencia actual
    empieza(v, apariencia, grupo) {
      const cats = categorias(grupo);
      const lista = candidatos(v, cats);
      if (!lista.length) return false;
      sesion = { v, lista };
      return true;
    },
    get activa() { return Boolean(sesion); },
    get deslizadores() { return sesion?.lista.map((c) => c.id) ?? []; },
    // Mueve: dx, dy en píxeles. «aPantalla» proyecta un punto del personaje (local) a píxeles
    mueve(dx, dy, apariencia, posicion, aPantalla) {
      if (!sesion) return false;
      const v = sesion.v;
      pa.set(posicion[v * 3], posicion[v * 3 + 1], posicion[v * 3 + 2]);
      const p0 = aPantalla(pa.clone());
      const J = [];
      for (const c of sesion.lista) {
        const inf = motor.influencia(c.id);
        const valor = apariencia.detalle[c.id] ?? 0;
        // Hacia valores positivos: si está en negativo, se deshace el target negativo
        let dir = null;
        if (valor >= 0 && deltaEn(inf.pos, v, d)) dir = d.clone();
        else if (valor < 0 && deltaEn(inf.neg, v, d)) dir = d.clone().negate();
        else if (deltaEn(inf.pos, v, d)) dir = d.clone();
        else if (deltaEn(inf.neg, v, d)) dir = d.clone().negate();
        if (!dir) { J.push([0, 0]); continue; }
        const p1 = aPantalla(pb.copy(pa).add(dir));
        J.push([p1.x - p0.x, p1.y - p0.y]);
      }
      // J es 2 × m: A = J Jᵀ + λI (2 × 2)
      let a = 0; let b = 0; let c2 = 0;
      for (const [jx, jy] of J) { a += jx * jx; b += jx * jy; c2 += jy * jy; }
      const lambda = 0.08 * (a + c2) + 1e-6;
      a += lambda; c2 += lambda;
      const det = a * c2 - b * b;
      if (Math.abs(det) < 1e-9) return false;
      const ix = (c2 * dx - b * dy) / det;
      const iy = (-b * dx + a * dy) / det;
      let cambio = false;
      sesion.lista.forEach((cnd, k) => {
        const delta = J[k][0] * ix + J[k][1] * iy;
        if (Math.abs(delta) < 1e-5) return;
        const s = motor.deslizadores.get(cnd.id);
        const min = s.neg ? -1 : 0;
        const nuevo = THREE.MathUtils.clamp((apariencia.detalle[cnd.id] ?? 0) + delta, min, 1);
        apariencia.detalle[cnd.id] = +nuevo.toFixed(4);
        cambio = true;
      });
      return cambio;
    },
    termina() { sesion = null; },
  };
}
