// Motor del cuerpo: lo mismo que hace MakeHuman, en el navegador.
//   posición = malla base + Σ macros (pesos de MakeHuman) + Σ detalles + expresiones
// Las macros llegan comprimidas (tools/40_editor_personaje.py): base de SVD de rango K y una tabla
// de coeficientes por target, así que se suman K vectores en vez de ~500 targets, más las
// correcciones dispersas de los targets activos. Los huesos salen de los cubos «joint-*» de la
// propia malla (cabeza y cola de cada uno = media de sus vértices), como en MakeHuman.
import { vista } from './datos.js';

// Años → valor de la macro «age» de MakeHuman (0,1875 = 11 años; 0,5 = 25; 1 = 90)
export function edadAMacro(anos) {
  if (anos < 25) return 0.1875 + ((anos - 11) / 14) * 0.3125;
  return Math.min(1, 0.5 + ((anos - 25) / 65) * 0.5);
}

// Tramos de una macro (macro.json): [[nombre, peso]], con los mismos límites estrictos que MPFB
function componentes(partes, valor) {
  const r = [];
  for (const p of partes) {
    if (valor > p.lowest && valor < p.highest) {
      const t = (valor - p.lowest) / (p.highest - p.lowest);
      if (p.low) r.push([p.low, 1 - t]);
      if (p.high) r.push([p.high, t]);
    }
  }
  return r;
}

// Pesos de todos los targets macro para unas macros (copia de calculate_target_stack de MPFB;
// el pecho sí se multiplica por lo «femenino» para que un hombre no lo herede)
export function pesosMacro(partes, m) {
  const c = {};
  // gender: 0 = mujer, 1 = hombre (como «sexo» aquí)
  const valores = {
    gender: m.sexo, age: edadAMacro(m.edad), muscle: m.musculo, weight: m.peso,
    proportions: m.proporciones, height: m.altura, cupsize: m.pecho, firmness: m.firmeza,
  };
  for (const [k, v] of Object.entries(valores)) c[k] = componentes(partes[k].parts, v);
  const pesos = new Map();
  const suma = (nombre, peso) => { if (peso > 1e-5) pesos.set(nombre, (pesos.get(nombre) ?? 0) + peso); };
  const origen = { african: m.origen.africano, asian: m.origen.asiatico, caucasian: m.origen.europeo };
  const totalOrigen = origen.african + origen.asian + origen.caucasian || 1;
  for (const [raza, w] of Object.entries(origen)) {
    for (const [a, wa] of c.age) for (const [g, wg] of c.gender) suma(`macrodetails/${raza}-${g}-${a}`, (w / totalOrigen) * wa * wg);
  }
  for (const [g, wg] of c.gender) for (const [a, wa] of c.age) for (const [mu, wm] of c.muscle) for (const [we, ww] of c.weight) {
    const base = wg * wa * wm * ww;
    suma(`macrodetails/universal-${g}-${a}-${mu}-${we}`, base);
    for (const [h, wh] of c.height) suma(`macrodetails/height/${g}-${a}-${mu}-${we}-${h}`, base * wh);
    for (const [p, wp] of c.proportions) suma(`macrodetails/proportions/${g}-${a}-${mu}-${we}-${p}`, base * wp);
    if (g === 'female') {
      for (const [cu, wc] of c.cupsize) for (const [f, wf] of c.firmness) {
        if (cu === 'averagecup' && f === 'averagefirmness') continue;
        suma(`breast/female-${a}-${mu}-${we}-${cu}-${f}`, base * wc * wf);
      }
    }
  }
  return pesos;
}

export function creaMotor({ meta, buffer }) {
  const n = meta.vertices;
  const base = vista(buffer, meta.posiciones);
  const M = meta.macro;
  const K = M.rango;
  const B = vista(buffer, M.base);               // K × 3n (int16)
  const escB = vista(buffer, M.escalas);
  const C = vista(buffer, M.coeficientes);       // T × K
  const indiceMacro = new Map(M.targets.map((t, i) => [t, i]));
  // Correcciones agrupadas por target (vienen ordenadas por target)
  const cT = vista(buffer, M.correcciones.t);
  const cV = vista(buffer, M.correcciones.v);
  const cD = vista(buffer, M.correcciones.d);
  const tramo = new Int32Array(M.targets.length + 1).fill(-1);
  for (let i = cT.length - 1; i >= 0; i--) tramo[cT[i]] = i;
  tramo[M.targets.length] = cT.length;
  for (let t = M.targets.length - 1; t >= 0; t--) if (tramo[t] < 0) tramo[t] = tramo[t + 1];
  const detalle = {};
  for (const [nombre, d] of Object.entries(meta.detalle.targets)) {
    detalle[nombre] = { v: vista(buffer, d.v), d: vista(buffer, d.d), e: d.e };
  }
  const expresiones = {};
  for (const [nombre, d] of Object.entries(meta.expresiones ?? {})) {
    expresiones[nombre] = { v: vista(buffer, d.v), d: vista(buffer, d.d), e: d.e };
  }
  const deslizadores = new Map(meta.detalle.deslizadores.map((s) => [s.id, s]));

  const macroPos = new Float32Array(n * 3);      // base + macros (solo cambia con las macros)
  const pos = new Float32Array(n * 3);           // + detalles + expresiones
  const coef = new Float64Array(K);
  let claveMacro = '';

  function sumaDisperso(dest, t, peso) {
    if (!t || !peso) return;
    const f = t.e * peso;
    const { v, d } = t;
    for (let i = 0; i < v.length; i++) {
      const j = v[i] * 3;
      dest[j] += d[i * 3] * f;
      dest[j + 1] += d[i * 3 + 1] * f;
      dest[j + 2] += d[i * 3 + 2] * f;
    }
  }

  function calculaMacros(macro) {
    const clave = JSON.stringify(macro);
    if (clave === claveMacro) return false;
    claveMacro = clave;
    const pesos = pesosMacro(M.partes, macro);
    coef.fill(0);
    macroPos.set(base);
    const escC = M.correcciones.e;
    for (const [nombre, w] of pesos) {
      const t = indiceMacro.get(nombre);
      if (t === undefined) continue;
      for (let k = 0; k < K; k++) coef[k] += w * C[t * K + k];
      const f = w * escC;
      for (let i = tramo[t]; i < tramo[t + 1]; i++) {
        const j = cV[i] * 3;
        macroPos[j] += cD[i * 3] * f;
        macroPos[j + 1] += cD[i * 3 + 1] * f;
        macroPos[j + 2] += cD[i * 3 + 2] * f;
      }
    }
    const n3 = n * 3;
    for (let k = 0; k < K; k++) {
      const f = coef[k] * escB[k];
      if (Math.abs(f) < 1e-9) continue;
      const o = k * n3;
      for (let i = 0; i < n3; i++) macroPos[i] += B[o + i] * f;
    }
    return true;
  }

  // Valor de un deslizador (−1…1) → peso de su target negativo o positivo
  function sumaDeslizador(dest, id, valor) {
    const s = deslizadores.get(id);
    if (!s || !valor) return;
    if (valor > 0 && s.pos) sumaDisperso(dest, detalle[s.pos], valor);
    else if (valor < 0 && s.neg) sumaDisperso(dest, detalle[s.neg], -valor);
  }

  function calcula(apariencia, expresion = {}) {
    calculaMacros(apariencia.macro);
    pos.set(macroPos);
    for (const [id, v] of Object.entries(apariencia.detalle ?? {})) sumaDeslizador(pos, id, v);
    for (const [id, v] of Object.entries(expresion)) sumaDisperso(pos, expresiones[id], v);
    return pos;
  }

  // Cabeza y cola de cada hueso (media de sus vértices) en metros
  const huesos = meta.huesos.map((h) => ({
    nombre: h.nombre, padre: h.padre,
    cabeza: Uint32Array.from(h.cabeza), cola: Uint32Array.from(h.cola),
  }));
  function media(p, lista, out, o) {
    let x = 0; let y = 0; let z = 0;
    for (let i = 0; i < lista.length; i++) { const j = lista[i] * 3; x += p[j]; y += p[j + 1]; z += p[j + 2]; }
    out[o] = x / lista.length; out[o + 1] = y / lista.length; out[o + 2] = z / lista.length;
  }
  function articulaciones(p) {
    const cabezas = new Float32Array(huesos.length * 3);
    const colas = new Float32Array(huesos.length * 3);
    huesos.forEach((h, i) => { media(p, h.cabeza, cabezas, i * 3); media(p, h.cola, colas, i * 3); });
    return { cabezas, colas };
  }

  // Vértices que mueve cada deslizador (para la escultura directa: qué se toca al pinchar)
  function influencia(id) {
    const s = deslizadores.get(id);
    return s ? { pos: s.pos ? detalle[s.pos] : null, neg: s.neg ? detalle[s.neg] : null } : null;
  }

  return {
    n, cuerpo: meta.cuerpo, huesos, calcula, articulaciones, influencia, deslizadores,
    expresiones: Object.keys(expresiones), base,
    sumaExpresion: (dest, nombre) => sumaDisperso(dest, expresiones[nombre], 1),
  };
}
