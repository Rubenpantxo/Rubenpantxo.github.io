// Arnés del paracaídas ajustado al cuerpo de cada personaje (el del modelo estaba hecho para un
// cuerpo fijo y flotaba delante del pecho). Se mide la superficie del cuerpo y de la ropa en
// reposo y se tienden por encima unas cintas planas:
//   - dos tirantes (elevadores principales): de la mochila, por encima del hombro y por delante
//     del pecho hasta la cadera
//   - la cinta del pecho entre los dos tirantes, con su hebilla
//   - las dos perneras, alrededor de lo alto de cada muslo
// Cada cinta sigue el contorno del cuerpo en un corte (de perfil para los tirantes, horizontal
// para el pecho y los muslos): por cada ángulo, lo más lejos del centro del corte que llega la
// superficie, más un poco. La malla va con piel: cada vértice copia los pesos del vértice del
// cuerpo más cercano, así se mueve con el personaje (posturas del salto incluidas).
// Todo en el sistema del objeto de la persona: +Y arriba, +Z delante, x del lado de cada miembro.
import * as THREE from 'three';

const ANCHO_M = 0.042;            // ancho de la cinta
const SEPARACION_M = 0.012;       // por encima de la ropa (la tela y la cinta no se deforman igual)
const GRADO = Math.PI / 180;

// Vértices de la superficie (cuerpo y ropa, sin pelo ni ojos) en el sistema del objeto, en reposo
function superficie(objeto) {
  const puntos = [];
  const mallas = [];
  objeto.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(objeto.matrixWorld).invert();
  objeto.traverse((o) => {
    if (!o.isSkinnedMesh || /pelo|ojos|cejas|pestanas|sombrero/.test(o.name)) return;
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const pos = o.geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m);
      puntos.push(v.x, v.y, v.z);
    }
    mallas.push(o);
  });
  return { p: Float32Array.from(puntos), mallas };
}

// Perfil polar de la superficie en un corte. «corte(x, y, z)» dice si el punto entra; «angulo» y
// «distancia» lo pasan a coordenadas del corte. Devuelve la distancia máxima por grado (suavizada)
function perfil(sup, corte, angulo, distancia) {
  const max = new Float32Array(360).fill(-1);
  const p = sup.p;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i]; const y = p[i + 1]; const z = p[i + 2];
    if (!corte(x, y, z)) continue;
    const a = Math.floor(((angulo(x, y, z) / GRADO) % 360 + 360) % 360);
    const d = distancia(x, y, z);
    if (d > max[a]) max[a] = d;
  }
  // Huecos (grados sin puntos): el vecino más cercano; luego media de 5 grados
  const lleno = Float32Array.from(max);
  for (let a = 0; a < 360; a++) {
    if (lleno[a] >= 0) continue;
    for (let k = 1; k < 30; k++) {
      const v = Math.max(max[(a + k) % 360], max[(a - k + 360) % 360]);
      if (v >= 0) { lleno[a] = v; break; }
    }
  }
  // El máximo de ±3 grados (la cinta va tensa por encima de los bultos, no se mete entre ellos)
  // y después media de ±2 para que no tenga escalones
  const maxi = lleno.map((_, a) => {
    let m = 0;
    for (let k = -3; k <= 3; k++) m = Math.max(m, lleno[(a + k + 360) % 360]);
    return m;
  });
  return maxi.map((_, a) => {
    let s = 0;
    for (let k = -2; k <= 2; k++) s += maxi[(a + k + 360) % 360];
    return s / 5;
  });
}

// Cinta plana a lo largo de unos puntos con su normal hacia fuera
function cinta(puntos, normales, cerrada = false) {
  const n = puntos.length;
  const pos = []; const nor = []; const uv = []; const ind = [];
  let largo = 0;
  for (let i = 0; i < n; i++) {
    const a = puntos[cerrada ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const b = puntos[cerrada ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const t = new THREE.Vector3().subVectors(b, a).normalize();
    const no = normales[i];
    const w = new THREE.Vector3().crossVectors(t, no).normalize().multiplyScalar(ANCHO_M / 2);
    const c = puntos[i].clone().addScaledVector(no, SEPARACION_M);
    if (i > 0) largo += puntos[i].distanceTo(puntos[i - 1]);
    for (const s of [-1, 1]) {
      const q = c.clone().addScaledVector(w, s);
      pos.push(q.x, q.y, q.z);
      nor.push(no.x, no.y, no.z);
      uv.push(s < 0 ? 0 : 1, largo / ANCHO_M);
    }
  }
  const tramos = cerrada ? n : n - 1;
  for (let i = 0; i < tramos; i++) {
    const a = i * 2; const b = ((i + 1) % n) * 2;
    ind.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ind);
  return g;
}

// Trama de la cinta (cincha tejida, con dos costuras a lo largo)
let texturaCincha = null;
function cincha() {
  if (texturaCincha) return texturaCincha;
  const c = document.createElement('canvas');
  c.width = 32; c.height = 64;
  const g = c.getContext('2d');
  const img = g.createImageData(32, 64);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 32; x++) {
      const hilo = Math.sin((y / 64) * Math.PI * 2 * 16 + (x % 2) * Math.PI) * 0.6;
      const costura = (x === 3 || x === 28) ? -1.4 : 0;
      const i = (y * 32 + x) * 4;
      img.data[i] = 128 + costura * 30;
      img.data[i + 1] = 128 + hilo * 34;
      img.data[i + 2] = 240; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  texturaCincha = new THREE.CanvasTexture(c);
  texturaCincha.wrapS = texturaCincha.wrapT = THREE.RepeatWrapping;
  texturaCincha.colorSpace = THREE.NoColorSpace;
  return texturaCincha;
}

// Pesos de piel: los del vértice de la superficie más cercano (solo entre los candidatos)
function conPiel(geo, sup, candidato) {
  const pos = geo.attributes.position;
  const n = pos.count;
  const si = new Uint16Array(n * 4);
  const sw = new Float32Array(n * 4);
  // Índice plano: vértice de la superficie → (malla, vértice)
  const tabla = [];
  for (const m of sup.mallas) for (let i = 0; i < m.geometry.attributes.position.count; i++) tabla.push(m, i);
  const p = sup.p;
  for (let k = 0; k < n; k++) {
    const x = pos.getX(k); const y = pos.getY(k); const z = pos.getZ(k);
    let mejor = -1; let dMejor = Infinity;
    for (let i = 0, j = 0; i < p.length; i += 3, j++) {
      if (!candidato(p[i], p[i + 1], p[i + 2])) continue;
      const d = (p[i] - x) ** 2 + (p[i + 1] - y) ** 2 + (p[i + 2] - z) ** 2;
      if (d < dMejor) { dMejor = d; mejor = j; }
    }
    if (mejor < 0) { sw[k * 4] = 1; continue; }
    const m = tabla[mejor * 2]; const i = tabla[mejor * 2 + 1];
    const a = m.geometry.attributes.skinIndex; const b = m.geometry.attributes.skinWeight;
    si.set([a.getX(i), a.getY(i), a.getZ(i), a.getW(i)], k * 4);
    sw.set([b.getX(i), b.getY(i), b.getZ(i), b.getW(i)], k * 4);
  }
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  return geo;
}

// Junta varias geometrías (mismos atributos) en una
function junta(geos) {
  const atributos = ['position', 'normal', 'uv', 'skinIndex', 'skinWeight'];
  const salida = new THREE.BufferGeometry();
  const ind = [];
  let base = 0;
  const datos = Object.fromEntries(atributos.map((a) => [a, []]));
  for (const g of geos) {
    for (const a of atributos) datos[a].push(...g.attributes[a].array);
    for (const i of g.index.array) ind.push(i + base);
    base += g.attributes.position.count;
  }
  salida.setAttribute('position', new THREE.Float32BufferAttribute(datos.position, 3));
  salida.setAttribute('normal', new THREE.Float32BufferAttribute(datos.normal, 3));
  salida.setAttribute('uv', new THREE.Float32BufferAttribute(datos.uv, 2));
  salida.setAttribute('skinIndex', new THREE.BufferAttribute(Uint16Array.from(datos.skinIndex), 4));
  salida.setAttribute('skinWeight', new THREE.Float32BufferAttribute(datos.skinWeight, 4));
  salida.setIndex(ind);
  return salida;
}

// Devuelve la malla con piel del arnés (o null si no hay cuerpo con esqueleto)
export function creaArnes(objeto) {
  const sup = superficie(objeto);
  const cuerpo = sup.mallas.find((m) => m.name === 'personaje_cuerpo') ?? sup.mallas[0];
  if (!cuerpo) return null;
  const esqueleto = cuerpo.skeleton;
  // Posición de reposo de cada hueso (de sus matrices de reposo, en el espacio de la malla)
  const reposo = (nombre) => {
    const i = esqueleto.bones.findIndex((b) => b.name === nombre);
    if (i < 0) return null;
    return new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(esqueleto.boneInverses[i]).invert());
  };
  const pecho = reposo('spine_03'); const pelvis = reposo('pelvis'); const cuello = reposo('neck_01');
  const hombro = reposo('upperarm_l'); const muslo = [reposo('thigh_l'), reposo('thigh_r')];
  if (!pecho || !pelvis || !cuello || !hombro || !muslo[0]) return null;
  const xTirante = Math.max(0.06, Math.abs(hombro.x) * 0.52);
  const yPerneras = Math.min(muslo[0].y, (muslo[1] ?? muslo[0]).y) - 0.11;     // altura de las perneras
  const tronco = (x) => Math.abs(x) < Math.abs(hombro.x) * 0.85;      // sin los brazos
  const geos = [];
  let hebilla = null;

  // --- Tirantes: corte de perfil en x = ±xTirante, centrado en el pecho
  for (const s of [1, -1]) {
    const x0 = s * xTirante;
    const c = new THREE.Vector3(x0, (pecho.y + cuello.y) / 2, pecho.z);
    const enCorte = (x, y, z) => Math.abs(x - x0) < 0.025 && y > yPerneras - 0.03;
    const ang = (x, y, z) => Math.atan2(z - c.z, y - c.y);            // 0 = arriba, 90° = delante
    const dist = (x, y, z) => Math.hypot(y - c.y, z - c.z);
    const d = perfil(sup, enCorte, ang, dist);
    const puntos = []; const normales = [];
    // De atrás arriba (sale de la mochila) por encima del hombro y por delante hasta la cadera
    for (let g = -140; g <= 178; g += 3) {
      const a = (((g % 360) + 360) % 360);
      const dir = new THREE.Vector3(0, Math.cos(g * GRADO), Math.sin(g * GRADO));
      const p = c.clone().addScaledVector(dir, d[a]);
      if (g > 90 && p.y < yPerneras + 0.02) break;          // baja hasta la pernera
      puntos.push(p);
      normales.push(dir);
    }
    geos.push(conPiel(cinta(puntos, normales), sup, (x, y, z) => tronco(x) && Math.abs(x - x0) < 0.06));
  }

  // --- Cinta del pecho: corte horizontal a la altura de las axilas, por delante
  {
    const y0 = pecho.y + (cuello.y - pecho.y) * 0.15;
    const c = new THREE.Vector3(0, y0, pecho.z - 0.02);
    const enCorte = (x, y, z) => Math.abs(y - y0) < 0.012 && tronco(x);
    const ang = (x, y, z) => Math.atan2(x, z - c.z);                   // 0 = delante
    const dist = (x, y, z) => Math.hypot(x, z - c.z);
    const d = perfil(sup, enCorte, ang, dist);
    const tope = Math.atan2(xTirante, 0.12) / GRADO;
    const puntos = []; const normales = [];
    for (let g = -tope; g <= tope; g += 2) {
      const a = Math.round(((g % 360) + 360) % 360) % 360;
      const dir = new THREE.Vector3(Math.sin(g * GRADO), 0, Math.cos(g * GRADO));
      puntos.push(c.clone().addScaledVector(dir, d[a] + 0.004));   // por encima de los tirantes
      normales.push(dir);
    }
    geos.push(conPiel(cinta(puntos, normales), sup, (x, y, z) => tronco(x) && Math.abs(y - y0) < 0.08));
    hebilla = { centro: puntos[Math.floor(puntos.length / 2)], normal: normales[Math.floor(normales.length / 2)] };
  }

  // --- Perneras: anillo alrededor de lo alto de cada muslo
  for (const [k, s] of [[0, 1], [1, -1]]) {
    const m = muslo[k];
    if (!m) continue;
    const y0 = yPerneras;
    const enCorte = (x, y, z) => Math.abs(y - y0) < 0.012 && Math.sign(x) === Math.sign(m.x) && Math.abs(x) > 0.015;
    // Centro del muslo a esa altura: el de los puntos del corte
    let cx = 0; let cz = 0; let n = 0;
    for (let i = 0; i < sup.p.length; i += 3) {
      if (enCorte(sup.p[i], sup.p[i + 1], sup.p[i + 2])) { cx += sup.p[i]; cz += sup.p[i + 2]; n++; }
    }
    if (!n) continue;
    const c = new THREE.Vector3(cx / n, y0, cz / n);
    const ang = (x, y, z) => Math.atan2(x - c.x, z - c.z);
    const dist = (x, y, z) => Math.hypot(x - c.x, z - c.z);
    const d = perfil(sup, enCorte, ang, dist);
    const puntos = []; const normales = [];
    for (let g = 0; g < 360; g += 6) {
      const dir = new THREE.Vector3(Math.sin(g * GRADO), 0, Math.cos(g * GRADO));
      puntos.push(c.clone().addScaledVector(dir, d[g]));
      normales.push(dir);
    }
    geos.push(conPiel(cinta(puntos, normales, true), sup, (x, y, z) => Math.sign(x) === Math.sign(m.x) && Math.abs(y - y0) < 0.08));
    void s;
  }

  const geo = junta(geos);
  const tex = cincha();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1c1f24, roughness: 0.78, metalness: 0, side: THREE.DoubleSide,
    normalMap: tex, normalScale: new THREE.Vector2(0.6, 0.6),
  });
  const malla = new THREE.SkinnedMesh(geo, mat);
  malla.name = 'salto_arnes';
  malla.frustumCulled = false;
  malla.castShadow = false;
  objeto.add(malla);
  malla.bind(esqueleto, new THREE.Matrix4());
  // Hebilla del pecho: metálica, sigue al hueso del pecho
  if (hebilla) {
    const g = new THREE.BoxGeometry(0.055, 0.03, 0.008);
    g.lookAt(hebilla.normal);
    const c = hebilla.centro.clone().addScaledVector(hebilla.normal, SEPARACION_M + 0.01);
    g.translate(c.x, c.y, c.z);
    const iPecho = Math.max(0, esqueleto.bones.findIndex((b) => b.name === 'spine_03'));
    const n = g.attributes.position.count;
    const si = new Uint16Array(n * 4); const sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { si[i * 4] = iPecho; sw[i * 4] = 1; }
    g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    const h = new THREE.SkinnedMesh(g, new THREE.MeshStandardMaterial({ color: 0xb9bdc2, roughness: 0.3, metalness: 0.9 }));
    h.name = 'salto_arnes_hebilla';
    h.frustumCulled = false;
    objeto.add(h);
    h.bind(esqueleto, new THREE.Matrix4());
  }
  return malla;
}
